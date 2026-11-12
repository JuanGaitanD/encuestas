"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { endSession, hashPassword, newId, newSlug, requireUser, startSession, verifyPassword } from "@/lib/auth";
import { ORDER_KEY, emptyDefinition, hasShuffle, orderLabel, parseDefinition, validOrder, validateAnswers, type Definition } from "@/lib/survey";

// name y email vuelven al formulario para no obligar a escribirlos de nuevo tras un error.
export type FormState = { error?: string; name?: string; email?: string };
export type Result = { ok: true } | { ok: false; error: string };

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const DUMMY_HASH = hashPassword("sin-cuenta");
// Topes para que una cuenta o un bot no agoten la base de datos que comparten todas las encuestas.
const MAX_SURVEYS_PER_USER = 20;
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

export async function logout() {
  await endSession();
  redirect("/");
}

export async function createSurvey() {
  const user = await requireUser();
  const [{ n }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM surveys WHERE user_id = $1", [user.id]);
  if (n >= MAX_SURVEYS_PER_USER) redirect("/panel?limite=1");
  const id = newId();
  await q("INSERT INTO surveys (id, user_id, slug, title, definition) VALUES ($1, $2, $3, $4, $5::jsonb)", [
    id,
    user.id,
    newSlug(),
    "Encuesta sin título",
    JSON.stringify(emptyDefinition()),
  ]);
  redirect(`/panel/${id}`);
}

export async function saveSurvey(id: string, title: string, slug: string, definition: unknown): Promise<Result> {
  const user = await requireUser();
  const cleanTitle = String(title ?? "").trim().slice(0, 200);
  const cleanSlug = String(slug ?? "").trim().toLowerCase();
  if (!cleanTitle) return { ok: false, error: "La encuesta necesita un título." };
  if (!/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(cleanSlug))
    return { ok: false, error: "La dirección admite de 3 a 60 letras minúsculas, números y guiones." };
  let def: Definition;
  try {
    def = parseDefinition(definition);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const [current] = await q<{ slug: string; locked: boolean }>(
    `SELECT slug, (published OR EXISTS (SELECT 1 FROM responses r WHERE r.survey_id = s.id)) AS locked
     FROM surveys s WHERE id = $1 AND user_id = $2`,
    [id, user.id],
  );
  if (!current) return { ok: false, error: "No se encontró la encuesta." };
  // Una dirección ya compartida no se libera: otra cuenta podría ocuparla y recibir a quienes tienen el enlace.
  if (current.locked && current.slug !== cleanSlug)
    return { ok: false, error: "La dirección no se puede cambiar cuando la encuesta está publicada o ya tiene respuestas." };
  const taken = await q("SELECT 1 FROM surveys WHERE slug = $1 AND id <> $2", [cleanSlug, id]);
  if (taken.length) return { ok: false, error: "Esa dirección ya la usa otra encuesta." };
  const rows = await q(
    `UPDATE surveys SET title = $1, slug = $2, definition = $3::jsonb, updated_at = now()
     WHERE id = $4 AND user_id = $5 RETURNING id`,
    [cleanTitle, cleanSlug, JSON.stringify(def), id, user.id],
  );
  if (!rows.length) return { ok: false, error: "No se encontró la encuesta." };
  revalidatePath(`/panel/${id}`);
  return { ok: true };
}

export async function setPublished(id: string, published: boolean) {
  const user = await requireUser();
  await q("UPDATE surveys SET published = $1, updated_at = now() WHERE id = $2 AND user_id = $3", [published, id, user.id]);
  revalidatePath(`/panel/${id}`);
}

export async function deleteSurvey(id: string) {
  const user = await requireUser();
  await q("DELETE FROM surveys WHERE id = $1 AND user_id = $2", [id, user.id]);
  redirect("/panel");
}

export async function deleteResponse(surveyId: string, responseId: string) {
  const user = await requireUser();
  // Solo borra si la respuesta es de una encuesta de quien lo pide.
  await q(
    "DELETE FROM responses r USING surveys s WHERE r.id = $1 AND r.survey_id = s.id AND s.id = $2 AND s.user_id = $3",
    [responseId, surveyId, user.id],
  );
  revalidatePath(`/panel/${surveyId}/respuestas`);
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
