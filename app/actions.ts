"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { createToken, endSession, hashPassword, newId, requireUser, startSession, verifyPassword } from "@/lib/auth";
import * as S from "@/lib/surveys";
import { ORDER_KEY, hasShuffle, orderLabel, validOrder, validateAnswers, type Definition } from "@/lib/survey";

// name y email vuelven al formulario para no obligar a escribirlos de nuevo tras un error.
export type FormState = { error?: string; name?: string; email?: string };
type Result = S.Result;

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const DUMMY_HASH = hashPassword("sin-cuenta");
// Topes para que una cuenta o un bot no agoten la base de datos que comparten todas las encuestas.
const MAX_RESPONSES_PER_SURVEY = 5000;
const MAX_RESPONSE_BYTES = 60_000;

// ponytail: sin límite de intentos ni verificación de correo; añadir ambos
// (p. ej. Upstash + Resend) si la instancia se abre a mucho público.
export async function register(_: FormState, data: FormData): Promise<FormState> {
  const name = field(data, "name").slice(0, 80);
  const email = field(data, "email").toLowerCase().slice(0, 300);
  const password = String(data.get("password") ?? "");
  if (!name) return { error: "Escribe tu nombre.", name, email };
  if (email.length > 200 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) return { error: "El correo no parece válido.", name, email };
  if (password.length < 8 || password.length > 200) return { error: "La contraseña debe tener al menos 8 caracteres.", name, email };

  const id = newId();
  const rows = await q(
    "INSERT INTO users (id, email, name, pass) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id",
    [id, email, name, await hashPassword(password)],
  );
  if (!rows.length) return { error: "Ya hay una cuenta con ese correo.", name, email };
  await startSession(id);
  redirect("/panel");
}

export async function login(_: FormState, data: FormData): Promise<FormState> {
  const email = field(data, "email").toLowerCase().slice(0, 300);
  const password = String(data.get("password") ?? "");
  if (email.length > 200 || password.length > 200) return { error: "Correo o contraseña incorrectos.", email };
  const [user] = await q<{ id: string; pass: string }>("SELECT id, pass FROM users WHERE email = $1", [email]);
  // Se verifica siempre contra algún hash para que el tiempo de respuesta no delate si el correo existe.
  const ok = await verifyPassword(password, user?.pass ?? (await DUMMY_HASH));
  if (!user || !ok) return { error: "Correo o contraseña incorrectos.", email };
  await startSession(user.id);
  redirect("/panel");
}

/** Crea o cambia la contraseña. Quien entró con Google no tiene una; quien ya tiene debe escribir la actual. */
export async function setPassword(_: FormState & { done?: boolean }, data: FormData): Promise<FormState & { done?: boolean }> {
  const user = await requireUser();
  const current = String(data.get("current") ?? "");
  const password = String(data.get("password") ?? "");
  if (password.length < 8 || password.length > 200) return { error: "La contraseña debe tener al menos 8 caracteres." };
  const [row] = await q<{ pass: string }>("SELECT pass FROM users WHERE id = $1", [user.id]);
  if (row?.pass && (current.length > 200 || !(await verifyPassword(current, row.pass)))) return { error: "La contraseña actual no es correcta." };
  await q("UPDATE users SET pass = $1 WHERE id = $2", [await hashPassword(password), user.id]);
  return { done: true };
}

export async function logout() {
  await endSession();
  redirect("/");
}

export async function createSurvey() {
  const user = await requireUser();
  const r = await S.createSurvey(user.id);
  redirect(r.ok ? `/panel/${r.id}` : "/panel?limite=1");
}

export async function saveSurvey(id: string, title: string, slug: string, definition: unknown, base?: string | null) {
  const user = await requireUser();
  const r = await S.saveSurvey(user.id, id, title, slug, definition, base);
  if (r.ok) revalidatePath(`/panel/${id}`);
  return r;
}

export async function setPublished(id: string, published: boolean) {
  const user = await requireUser();
  await S.setPublished(user.id, id, published);
  revalidatePath(`/panel/${id}`);
}

export async function deleteSurvey(id: string) {
  const user = await requireUser();
  await S.deleteSurvey(user.id, id);
  redirect("/panel");
}

export async function deleteResponse(surveyId: string, responseId: string) {
  const user = await requireUser();
  await S.deleteResponse(user.id, surveyId, responseId);
  revalidatePath(`/panel/${surveyId}/respuestas`);
}

export async function addEditor(surveyId: string, email: string): Promise<S.Result<{ editors: S.Editor[] }>> {
  const user = await requireUser();
  const r = await S.addEditor(user.id, surveyId, email);
  return r.ok ? { ok: true, editors: await S.listEditors(surveyId) } : r;
}

export async function removeEditor(surveyId: string, editorId: string): Promise<S.Result<{ editors: S.Editor[] }>> {
  const user = await requireUser();
  const r = await S.removeEditor(user.id, surveyId, editorId);
  return r.ok ? { ok: true, editors: await S.listEditors(surveyId) } : r;
}

const MAX_TOKENS = 10;

export async function newToken(name: string): Promise<S.Result<{ token: string }>> {
  const user = await requireUser();
  const [{ n }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM api_tokens WHERE user_id = $1", [user.id]);
  if (n >= MAX_TOKENS) return { ok: false, error: `Máximo ${MAX_TOKENS} claves. Revoca alguna para crear otra.` };
  const token = await createToken(user.id, String(name ?? "").trim().slice(0, 60) || "Sin nombre");
  revalidatePath("/panel/conexion");
  return { ok: true, token };
}

export async function revokeToken(id: string) {
  const user = await requireUser();
  await q("DELETE FROM api_tokens WHERE id = $1 AND user_id = $2", [id, user.id]);
  revalidatePath("/panel/conexion");
}

// ponytail: sin límite por IP ni captcha; el campo trampa frena los bots
// simples. Añadir Turnstile o similar si una encuesta recibe abuso.
export async function submitResponse(slug: string, raw: unknown, trap: string, order?: unknown): Promise<Result> {
  if (trap) return { ok: true };
  if (JSON.stringify(raw ?? {}).length > MAX_RESPONSE_BYTES) return { ok: false, error: "La respuesta es demasiado grande." };
  const [survey] = await q<{ id: string; definition: Definition }>(
    "SELECT id, definition FROM surveys WHERE slug = $1 AND published",
    [String(slug)],
  );
  if (!survey) return { ok: false, error: "Esta encuesta ya no recibe respuestas." };
  const checked = validateAnswers(survey.definition, raw);
  if (!checked.ok) return checked;
  const [{ n }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM responses WHERE survey_id = $1", [survey.id]);
  if (n >= MAX_RESPONSES_PER_SURVEY) return { ok: false, error: "Esta encuesta alcanzó el máximo de respuestas." };
  if (hasShuffle(survey.definition)) {
    // El orden en que se vieron las páginas se guarda con la respuesta para poder analizar su efecto.
    if (!validOrder(survey.definition, order))
      return { ok: false, error: "No se pudo registrar el orden de las páginas. Recarga e inténtalo de nuevo." };
    checked.answers[ORDER_KEY] = orderLabel(order);
  }
  await q("INSERT INTO responses (id, survey_id, answers) VALUES ($1, $2, $3::jsonb)", [
    newId(),
    survey.id,
    JSON.stringify(checked.answers),
  ]);
  return { ok: true };
}
