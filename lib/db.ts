// Acceso a datos. Con DATABASE_URL usa Postgres (Neon, por HTTP); sin ella,
// un Postgres embebido (PGlite) en .data/ para desarrollo local sin instalar nada.

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Run = (text: string, params?: unknown[]) => Promise<Row[]>;

// ponytail: el esquema se crea con IF NOT EXISTS al primer uso; pasar a
// migraciones versionadas cuando haya que alterar tablas con datos.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id uuid PRIMARY KEY,
     email text UNIQUE NOT NULL,
     name text NOT NULL,
     pass text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash text PRIMARY KEY,
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at timestamptz NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS surveys (
     id uuid PRIMARY KEY,
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     slug text UNIQUE NOT NULL,
     title text NOT NULL,
     definition jsonb NOT NULL,
     published boolean NOT NULL DEFAULT false,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS responses (
     id uuid PRIMARY KEY,
     survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
     answers jsonb NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS responses_survey ON responses(survey_id)`,
  // Personas que pueden editar una encuesta además de quien la creó.
  `CREATE TABLE IF NOT EXISTS survey_editors (
     survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     PRIMARY KEY (survey_id, user_id))`,
  // Claves para entrar por MCP sin sesión de navegador. Solo se guarda el hash.
  `CREATE TABLE IF NOT EXISTS api_tokens (
     id uuid PRIMARY KEY,
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name text NOT NULL,
     token_hash text UNIQUE NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now())`,
  // Cuenta de Google enlazada a una cuenta. De Google solo se guarda su identificador (`sub`) y el correo que confirmó.
  `CREATE TABLE IF NOT EXISTS google_accounts (
     sub text PRIMARY KEY,
     user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     email text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now())`,
];

async function connect(): Promise<Run> {
  let run: Run;
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);
    run = (text, params = []) => sql.query(text, params) as Promise<Row[]>;
  } else {
    if (process.env.VERCEL) throw new Error("Falta la variable DATABASE_URL");
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdirSync } = await import("node:fs");
    const dir = process.env.PGLITE_DIR ?? ".data/pg";
    mkdirSync(dir, { recursive: true });
    const pg = new PGlite(dir);
    run = async (text, params = []) => (await pg.query<Row>(text, params)).rows;
  }
  for (const statement of SCHEMA) await run(statement);
  return run;
}

const g = globalThis as { __db?: Promise<Run> };

export async function q<T = Row>(text: string, params?: unknown[]): Promise<T[]> {
  // Si la conexión falla no se guarda la promesa rota: el siguiente intento reconecta.
  g.__db ??= connect().catch((e) => {
    g.__db = undefined;
    throw e;
  });
  return (await (await g.__db)(text, params)) as T[];
}
