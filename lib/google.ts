// Inicio de sesión con Google (OpenID Connect, flujo de código con state, nonce y PKCE), sin librerías.
// De Google solo se guarda su identificador de la persona (`sub`) y el correo que confirmó.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { q } from "./db.ts";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type GoogleClaims = { sub: string; email: string; email_verified: boolean; name?: string };
export type GoogleResult =
  | { ok: true; userId: string; created: boolean; linked: boolean }
  | { ok: false; reason: "sin_verificar" | "otra_cuenta" | "correo_distinto" | "cuenta_con_otro_google" };

/** Las credenciales salen del entorno. Sin ellas, el botón no se muestra y las rutas no hacen nada. */
export function googleConfig(): { id: string; secret: string } | null {
  const id = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

const b64url = (b: Buffer) => b.toString("base64url");
export const randomToken = () => b64url(randomBytes(32));
export const challengeOf = (verifier: string) => b64url(createHash("sha256").update(verifier).digest());
export const redirectUri = (origin: string) => `${origin}/api/auth/google/callback`;

export function authUrl(clientId: string, origin: string, p: { state: string; nonce: string; verifier: string }): string {
  const u = new URL(AUTH);
  u.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state: p.state,
    nonce: p.nonce,
    code_challenge: challengeOf(p.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return u.toString();
}

/**
 * Revisa lo que dice el `id_token`. Llega directo de Google por TLS en la respuesta del intercambio,
 * así que (según OpenID Connect Core 3.1.3.7) basta con comprobar emisor, audiencia, vigencia y nonce.
 */
export function readClaims(idToken: string, clientId: string, nonce: string, now = Date.now()): GoogleClaims | null {
  let c: Record<string, unknown>;
  try {
    c = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!ISSUERS.includes(String(c.iss)) || c.aud !== clientId || c.nonce !== nonce) return null;
  if (typeof c.exp !== "number" || c.exp * 1000 < now) return null;
  if (typeof c.sub !== "string" || !c.sub || typeof c.email !== "string" || !c.email) return null;
  return {
    sub: c.sub,
    email: c.email.toLowerCase(),
    // Google lo manda como booleano; algunas respuestas antiguas, como texto.
    email_verified: c.email_verified === true || c.email_verified === "true",
    name: typeof c.name === "string" ? c.name : undefined,
  };
}

/** Cambia el código por el `id_token` y devuelve sus datos, o null si algo no cuadra. */
export async function exchange(code: string, verifier: string, origin: string, nonce: string): Promise<GoogleClaims | null> {
  const cfg = googleConfig();
  if (!cfg) return null;
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.id,
      client_secret: cfg.secret,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { id_token?: string };
  return body.id_token ? readClaims(body.id_token, cfg.id, nonce) : null;
}

/**
 * Decide a qué cuenta entra una persona que llega con Google. Reglas:
 * - Nunca se confía en un correo que Google no confirmó: sería una vía para quedarse con la cuenta de otro.
 * - Si ese Google ya está enlazado, entra a su cuenta.
 * - Si hay una cuenta con ese mismo correo, se enlaza y entra a ella (conserva su contraseña).
 * - Si no hay ninguna, se crea una cuenta sin contraseña.
 * - Con sesión iniciada (`sessionUserId`), solo enlaza ese Google a esa cuenta, y solo si el correo coincide.
 */
export async function signInWithGoogle(g: GoogleClaims, sessionUserId?: string): Promise<GoogleResult> {
  if (!g.email_verified) return { ok: false, reason: "sin_verificar" };
  const email = g.email.toLowerCase();
  const [link] = await q<{ user_id: string }>("SELECT user_id FROM google_accounts WHERE sub = $1", [g.sub]);

  if (sessionUserId) {
    if (link) return link.user_id === sessionUserId ? { ok: true, userId: sessionUserId, created: false, linked: false } : { ok: false, reason: "otra_cuenta" };
    const [me] = await q<{ email: string }>("SELECT email FROM users WHERE id = $1", [sessionUserId]);
    if (!me || me.email !== email) return { ok: false, reason: "correo_distinto" };
    return attach(g.sub, email, sessionUserId, false);
  }

  if (link) return { ok: true, userId: link.user_id, created: false, linked: false };
  const [user] = await q<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
  if (user) return attach(g.sub, email, user.id, false);

  const id = randomUUID();
  const name = (g.name?.trim() || email.split("@")[0]).slice(0, 80);
  // Sin contraseña: la columna queda vacía y ninguna contraseña la iguala. Se puede crear una después en «Cuenta».
  const made = await q("INSERT INTO users (id, email, name, pass) VALUES ($1, $2, $3, '') ON CONFLICT (email) DO NOTHING RETURNING id", [id, email, name]);
  if (!made.length) return signInWithGoogle(g); // otra petición la creó a la vez
  return attach(g.sub, email, id, true);
}

async function attach(sub: string, email: string, userId: string, created: boolean): Promise<GoogleResult> {
  // Una cuenta tiene un solo Google y un Google una sola cuenta: lo garantizan las claves de la tabla.
  const rows = await q("INSERT INTO google_accounts (sub, user_id, email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING sub", [sub, userId, email]);
  if (!rows.length) {
    const [mine] = await q<{ sub: string }>("SELECT sub FROM google_accounts WHERE user_id = $1", [userId]);
    return mine?.sub === sub ? { ok: true, userId, created, linked: false } : { ok: false, reason: "cuenta_con_otro_google" };
  }
  return { ok: true, userId, created, linked: true };
}
