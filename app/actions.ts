"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { endSession, hashPassword, newId, newSlug, requireUser, startSession, verifyPassword } from "@/lib/auth";
import { emptyDefinition, parseDefinition, validateAnswers, type Definition } from "@/lib/survey";

export type FormState = { error?: string };
export type Result = { ok: true } | { ok: false; error: string };

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

// ponytail: sin límite de intentos ni verificación de correo; añadir ambos
// (p. ej. Upstash + Resend) si la instancia se abre a mucho público.
export async function register(_: FormState, data: FormData): Promise<FormState> {
  const name = field(data, "name").slice(0, 80);
  const email = field(data, "email").toLowerCase();
  const password = String(data.get("password") ?? "");
  if (!name) return { error: "Escribe tu nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { error: "El correo no parece válido." };
  if (password.length < 8 || password.length > 200) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const id = newId();
  const rows = await q(
    "INSERT INTO users (id, email, name, pass) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id",
    [id, email, name, await hashPassword(password)],
  );
  if (!rows.length) return { error: "Ya hay una cuenta con ese correo." };
  await startSession(id);
  redirect("/panel");
}

export async function login(_: FormState, data: FormData): Promise<FormState> {
  const email = field(data, "email").toLowerCase();
  const password = String(data.get("password") ?? "");
  const [user] = await q<{ id: string; pass: string }>("SELECT id, pass FROM users WHERE email = $1", [email]);
  if (!user || !(await verifyPassword(password, user.pass))) return { error: "Correo o contraseña incorrectos." };
  await startSession(user.id);
  redirect("/panel");
}

export async function logout() {
  await endSession();
  redirect("/");
}

export async function createSurvey() {
  const user = await requireUser();
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

// ponytail: sin límite por IP ni captcha; el campo trampa frena los bots
// simples. Añadir Turnstile o similar si una encuesta recibe abuso.
export async function submitResponse(slug: string, raw: unknown, trap: string): Promise<Result> {
  if (trap) return { ok: true };
  if (JSON.stringify(raw ?? {}).length > 200_000) return { ok: false, error: "La respuesta es demasiado grande." };
  const [survey] = await q<{ id: string; definition: Definition }>(
    "SELECT id, definition FROM surveys WHERE slug = $1 AND published",
    [String(slug)],
  );
  if (!survey) return { ok: false, error: "Esta encuesta ya no recibe respuestas." };
  const checked = validateAnswers(survey.definition, raw);
  if (!checked.ok) return checked;
  await q("INSERT INTO responses (id, survey_id, answers) VALUES ($1, $2, $3::jsonb)", [
    newId(),
    survey.id,
    JSON.stringify(checked.answers),
  ]);
  return { ok: true };
}
