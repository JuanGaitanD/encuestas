import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// Base embebida en una carpeta temporal: la prueba no toca datos de nadie.
delete process.env.DATABASE_URL;
process.env.PGLITE_DIR = join(mkdtempSync(join(tmpdir(), "encuestas-")), "pg");
const { q } = await import("./db.ts");
const S = await import("./surveys.ts");

const user = async (email: string) => {
  const id = crypto.randomUUID();
  await q("INSERT INTO users (id, email, name, pass) VALUES ($1, $2, $3, 'x')", [id, email, email]);
  return id;
};

test("solo el dueño y sus editores entran, y un guardado viejo no pisa uno nuevo", async () => {
  const [ana, beto, caro] = [await user("ana@example.com"), await user("beto@example.com"), await user("caro@example.com")];
  const made = await S.createSurvey(ana);
  assert.ok(made.ok);
  const id = made.id;
  const def = { pages: [{ questions: [{ id: "a", type: "short", label: "a" }] }] };

  assert.equal(await S.getSurvey(beto, id), null);
  assert.equal((await S.saveSurvey(beto, id, "t", "abc", def)).ok, false);
  assert.equal((await S.addEditor(beto, id, "caro@example.com")).ok, false); // solo el dueño añade
  assert.equal((await S.addEditor(ana, id, "nadie@example.com")).ok, false);
  assert.ok((await S.addEditor(ana, id, " Beto@Example.com ")).ok);

  const seen = await S.getSurvey(beto, id);
  assert.equal(seen?.owner, false);
  assert.equal((await S.listSurveys(beto)).length, 1);
  assert.equal((await S.listSurveys(caro)).length, 0);

  // Ana y Beto abren la misma versión; Beto guarda primero.
  const first = await S.saveSurvey(beto, id, "de beto", seen!.slug, def, seen!.version);
  assert.ok(first.ok);
  const stale = await S.saveSurvey(ana, id, "de ana", seen!.slug, def, seen!.version);
  assert.equal(stale.ok, false);
  assert.equal(!stale.ok && stale.conflict, true);
  assert.equal((await S.getSurvey(ana, id))?.title, "de beto");
  assert.ok((await S.saveSurvey(ana, id, "de ana", seen!.slug, def, first.version)).ok);
  assert.ok((await S.saveSurvey(ana, id, "forzado", seen!.slug, def, null)).ok);

  assert.equal((await S.deleteSurvey(beto, id)).ok, false); // un editor no borra la encuesta
  assert.ok((await S.removeEditor(ana, id, beto)).ok);
  assert.equal(await S.getSurvey(beto, id), null);
  assert.ok((await S.deleteSurvey(ana, id)).ok);
});
