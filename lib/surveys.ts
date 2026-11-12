// Operaciones sobre encuestas en nombre de una persona. Las usan el panel (acciones de servidor)
// y el servidor MCP, así que el control de acceso vive aquí y no en cada pantalla.
import { randomBytes, randomUUID } from "node:crypto";
import { q } from "./db.ts";
import { emptyDefinition, parseDefinition, toCsv, type Answers, type Definition } from "./survey.ts";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; conflict?: boolean };
export type Survey = { id: string; title: string; slug: string; published: boolean; definition: Definition; owner: boolean; version: string };
export type Editor = { id: string; name: string; email: string };

// Topes para que una cuenta no agote la base de datos que comparten todas las encuestas.
const MAX_SURVEYS_PER_USER = 20;
const MAX_EDITORS = 20;
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const NOT_FOUND = { ok: false, error: "No se encontró la encuesta." } as const;
// Puede entrar quien creó la encuesta y quien fue añadido como editor.
const CAN = "(s.user_id = $1 OR EXISTS (SELECT 1 FROM survey_editors e WHERE e.survey_id = s.id AND e.user_id = $1))";

/** La encuesta, solo si la persona es su dueña o una de sus editoras. `version` cambia con cada guardado. */
export async function getSurvey(userId: string, id: string): Promise<Survey | null> {
  if (!UUID.test(id)) return null;
  const [s] = await q<Survey>(
    `SELECT s.id, s.title, s.slug, s.published, s.definition, (s.user_id = $1) AS owner, s.updated_at::text AS version
     FROM surveys s WHERE s.id = $2 AND ${CAN}`,
    [userId, id],
  );
  return s ?? null;
}

export const listSurveys = (userId: string) =>
  q<{ id: string; title: string; slug: string; published: boolean; owner: boolean; n: number }>(
    `SELECT s.id, s.title, s.slug, s.published, (s.user_id = $1) AS owner,
            (SELECT count(*)::int FROM responses r WHERE r.survey_id = s.id) AS n
     FROM surveys s WHERE ${CAN} ORDER BY s.updated_at DESC`,
    [userId],
  );

export async function createSurvey(userId: string, title = "Encuesta sin título", definition?: unknown): Promise<Result<{ id: string }>> {
  let def: Definition;
  try {
    def = definition === undefined ? emptyDefinition() : parseDefinition(definition);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const [{ n }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM surveys WHERE user_id = $1", [userId]);
  if (n >= MAX_SURVEYS_PER_USER) return { ok: false, error: `Máximo ${MAX_SURVEYS_PER_USER} encuestas por cuenta. Borra alguna para crear otra.` };
  const id = randomUUID();
  await q("INSERT INTO surveys (id, user_id, slug, title, definition) VALUES ($1, $2, $3, $4, $5::jsonb)", [
    id,
    userId,
    randomBytes(5).toString("hex"),
    String(title).trim().slice(0, 200) || "Encuesta sin título",
    JSON.stringify(def),
  ]);
  return { ok: true, id };
}

/**
 * Guarda título, dirección y definición. `base` es la versión que la persona tenía abierta: si otra
 * guardó después, no se pisa su trabajo y se devuelve `conflict`. Con `base` nulo se guarda sin comprobar.
 */
export async function saveSurvey(userId: string, id: string, title: string, slug: string, definition: unknown, base?: string | null): Promise<Result<{ version: string }>> {
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
  const current = await getSurvey(userId, id);
  if (!current) return NOT_FOUND;
  // Una dirección ya compartida no se libera: otra cuenta podría ocuparla y recibir a quienes tienen el enlace.
  if (current.slug !== cleanSlug) {
    const used = current.published || (await q("SELECT 1 FROM responses WHERE survey_id = $1 LIMIT 1", [id])).length > 0;
    if (used) return { ok: false, error: "La dirección no se puede cambiar cuando la encuesta está publicada o ya tiene respuestas." };
    const taken = await q("SELECT 1 FROM surveys WHERE slug = $1 AND id <> $2", [cleanSlug, id]);
    if (taken.length) return { ok: false, error: "Esa dirección ya la usa otra encuesta." };
  }
  const rows = await q<{ version: string }>(
    `UPDATE surveys SET title = $1, slug = $2, definition = $3::jsonb, updated_at = now()
     WHERE id = $4 AND ($5::text IS NULL OR updated_at::text = $5) RETURNING updated_at::text AS version`,
    [cleanTitle, cleanSlug, JSON.stringify(def), id, base ?? null],
  );
  if (!rows.length) return { ok: false, conflict: true, error: "Otra persona guardó cambios en esta encuesta mientras la editabas." };
  return { ok: true, version: rows[0].version };
}

export async function setPublished(userId: string, id: string, published: boolean): Promise<Result> {
  if (!(await getSurvey(userId, id))) return NOT_FOUND;
  // No toca updated_at: publicar no es un cambio de contenido y no debe chocar con quien está editando.
  await q("UPDATE surveys SET published = $1 WHERE id = $2", [published === true, id]);
  return { ok: true };
}

/** Solo quien creó la encuesta puede borrarla. */
export async function deleteSurvey(userId: string, id: string): Promise<Result> {
  if (!UUID.test(id)) return NOT_FOUND;
  const rows = await q("DELETE FROM surveys WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);
  return rows.length ? { ok: true } : NOT_FOUND;
}

export async function deleteResponse(userId: string, surveyId: string, responseId: string): Promise<Result> {
  if (!UUID.test(responseId) || !(await getSurvey(userId, surveyId))) return NOT_FOUND;
  await q("DELETE FROM responses WHERE id = $1 AND survey_id = $2", [responseId, surveyId]);
  return { ok: true };
}

export const responses = (surveyId: string) =>
  q<{ id: string; created_at: string | Date; answers: Answers }>("SELECT id, created_at, answers FROM responses WHERE survey_id = $1 ORDER BY created_at", [surveyId]);

export async function csv(userId: string, id: string): Promise<string | null> {
  const survey = await getSurvey(userId, id);
  return survey && toCsv(survey.definition, await responses(id));
}

export const listEditors = (surveyId: string) =>
  q<Editor>("SELECT u.id, u.name, u.email FROM survey_editors e JOIN users u ON u.id = e.user_id WHERE e.survey_id = $1 ORDER BY u.name", [surveyId]);

/** Solo quien creó la encuesta decide quién más la edita. La otra persona debe tener cuenta. */
export async function addEditor(userId: string, surveyId: string, email: string): Promise<Result> {
  const survey = await getSurvey(userId, surveyId);
  if (!survey?.owner) return NOT_FOUND;
  const [other] = await q<{ id: string }>("SELECT id FROM users WHERE email = $1", [String(email ?? "").trim().toLowerCase().slice(0, 200)]);
  if (!other) return { ok: false, error: "No hay ninguna cuenta con ese correo. Pídele que se registre primero." };
  if (other.id === userId) return { ok: false, error: "Ya eres quien administra esta encuesta." };
  if ((await listEditors(surveyId)).length >= MAX_EDITORS) return { ok: false, error: `Máximo ${MAX_EDITORS} personas por encuesta.` };
  await q("INSERT INTO survey_editors (survey_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [surveyId, other.id]);
  return { ok: true };
}

export async function removeEditor(userId: string, surveyId: string, editorId: string): Promise<Result> {
  const survey = await getSurvey(userId, surveyId);
  if (!survey?.owner || !UUID.test(editorId)) return NOT_FOUND;
  await q("DELETE FROM survey_editors WHERE survey_id = $1 AND user_id = $2", [surveyId, editorId]);
  return { ok: true };
}
