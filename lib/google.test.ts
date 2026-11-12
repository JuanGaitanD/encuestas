import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// Base embebida en una carpeta temporal: la prueba no toca datos de nadie.
delete process.env.DATABASE_URL;
process.env.PGLITE_DIR = join(mkdtempSync(join(tmpdir(), "encuestas-g-")), "pg");
const { q } = await import("./db.ts");
const G = await import("./google.ts");
const { hashPassword, verifyPassword } = await import("./password.ts");

const account = async (email: string, password = "clave-de-ana-123") => {
  const id = crypto.randomUUID();
  await q("INSERT INTO users (id, email, name, pass) VALUES ($1, $2, $3, $4)", [id, email, email, await hashPassword(password)]);
  return id;
};
const users = async () => Number((await q<{ n: string }>("SELECT count(*) AS n FROM users"))[0].n);
const linkOf = async (id: string) => (await q<{ sub: string }>("SELECT sub FROM google_accounts WHERE user_id = $1", [id]))[0]?.sub;
const passOf = async (id: string) => (await q<{ pass: string }>("SELECT pass FROM users WHERE id = $1", [id]))[0].pass;

test("correo verificado y coincidente: enlaza la cuenta que ya existía y conserva su contraseña", async () => {
  const ana = await account("ana@example.com");
  const before = await users();
  const r = await G.signInWithGoogle({ sub: "g-ana", email: "Ana@Example.com", email_verified: true, name: "Ana" });
  assert.deepEqual(r, { ok: true, userId: ana, created: false, linked: true });
  assert.equal(await users(), before, "no crea otra cuenta");
  assert.equal(await linkOf(ana), "g-ana");
  // Entra de las dos formas a la misma cuenta: por contraseña…
  assert.equal(await verifyPassword("clave-de-ana-123", await passOf(ana)), true);
  // …y otra vez por Google, ahora por su identificador aunque el correo de Google cambie.
  const again = await G.signInWithGoogle({ sub: "g-ana", email: "otro@example.com", email_verified: true });
  assert.deepEqual(again, { ok: true, userId: ana, created: false, linked: false });
});

test("correo sin verificar: no entra, no enlaza y no crea cuenta", async () => {
  const beto = await account("beto@example.com");
  const before = await users();
  assert.deepEqual(await G.signInWithGoogle({ sub: "g-ladron", email: "beto@example.com", email_verified: false }), { ok: false, reason: "sin_verificar" });
  assert.deepEqual(await G.signInWithGoogle({ sub: "g-nadie", email: "nadie@example.com", email_verified: false }), { ok: false, reason: "sin_verificar" });
  assert.equal(await linkOf(beto), undefined);
  assert.equal(await users(), before);
});

test("cuenta nueva por Google: se crea sin contraseña, no entra con ninguna y puede ponerse una después", async () => {
  const r = await G.signInWithGoogle({ sub: "g-caro", email: "caro@example.com", email_verified: true, name: "  Caro Díaz  " });
  assert.ok(r.ok && r.created && r.linked);
  const [u] = await q<{ name: string }>("SELECT name FROM users WHERE id = $1", [r.userId]);
  assert.equal(u.name, "Caro Díaz");
  assert.equal(await passOf(r.userId), "");
  for (const guess of ["", ":", "x", "caro@example.com"]) assert.equal(await verifyPassword(guess, ""), false);
  await q("UPDATE users SET pass = $1 WHERE id = $2", [await hashPassword("nueva-clave-123"), r.userId]);
  assert.equal(await verifyPassword("nueva-clave-123", await passOf(r.userId)), true);
  assert.deepEqual(await G.signInWithGoogle({ sub: "g-caro", email: "caro@example.com", email_verified: true }), { ok: true, userId: r.userId, created: false, linked: false });
});

test("una cuenta tiene un solo Google y un Google una sola cuenta", async () => {
  const dani = await account("dani@example.com");
  assert.ok((await G.signInWithGoogle({ sub: "g-dani", email: "dani@example.com", email_verified: true })).ok);
  // Otro Google con el mismo correo confirmado no reemplaza al enlazado.
  assert.deepEqual(await G.signInWithGoogle({ sub: "g-dani-2", email: "dani@example.com", email_verified: true }), { ok: false, reason: "cuenta_con_otro_google" });
  assert.equal(await linkOf(dani), "g-dani");
});

test("conectar desde la sesión: solo con correo verificado y el mismo de la cuenta", async () => {
  const eva = await account("eva@example.com");
  const fer = await account("fer@example.com");
  assert.deepEqual(await G.signInWithGoogle({ sub: "g-x", email: "otra@example.com", email_verified: true }, eva), { ok: false, reason: "correo_distinto" });
  assert.deepEqual(await G.signInWithGoogle({ sub: "g-eva", email: "eva@example.com", email_verified: false }, eva), { ok: false, reason: "sin_verificar" });
  assert.deepEqual(await G.signInWithGoogle({ sub: "g-eva", email: "eva@example.com", email_verified: true }, eva), { ok: true, userId: eva, created: false, linked: true });
  // El Google de Eva no se puede conectar a la cuenta de Fer.
  assert.deepEqual(await G.signInWithGoogle({ sub: "g-eva", email: "eva@example.com", email_verified: true }, fer), { ok: false, reason: "otra_cuenta" });
});

test("el id_token se rechaza si no es de Google, de esta app, de este intento o está vencido", () => {
  const now = Date.now();
  const exp = Math.floor(now / 1000) + 300;
  const token = (c: object) => `x.${Buffer.from(JSON.stringify(c)).toString("base64url")}.y`;
  const good = { iss: "https://accounts.google.com", aud: "mi-cliente", nonce: "n1", exp, sub: "g-1", email: "A@Example.com", email_verified: true, name: "A" };
  assert.deepEqual(G.readClaims(token(good), "mi-cliente", "n1", now), { sub: "g-1", email: "a@example.com", email_verified: true, name: "A" });
  assert.equal(G.readClaims(token({ ...good, iss: "https://evil.example" }), "mi-cliente", "n1", now), null);
  assert.equal(G.readClaims(token({ ...good, aud: "otro-cliente" }), "mi-cliente", "n1", now), null);
  assert.equal(G.readClaims(token(good), "mi-cliente", "otro-nonce", now), null);
  assert.equal(G.readClaims(token({ ...good, exp: exp - 1000 }), "mi-cliente", "n1", now), null);
  assert.equal(G.readClaims("basura", "mi-cliente", "n1", now), null);
  assert.equal(G.readClaims(token({ ...good, email_verified: "false" }), "mi-cliente", "n1", now)?.email_verified, false);
});
