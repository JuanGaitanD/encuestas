// node --test lib/survey.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDefinition, randomOrder, toCsv, validOrder, validateAnswers } from "./survey.ts";

const def = parseDefinition({
  intro: "Hola",
  pages: [
    {
      title: "Uno",
      questions: [
        { id: "sem", type: "number", label: "Semestre", required: true, min: 1, max: 10 },
        { id: "uso", type: "single", label: "Uso", options: ["Sí", "No", ""], other: true },
        { id: "leng", type: "multi", label: "Lenguajes", options: ["Python", "Java"] },
        { id: "conf", type: "scale", label: "Confianza", points: 5 },
        {
          id: "ae",
          type: "matrix",
          label: "Capacidad",
          required: true,
          columns: ["Nada", "Algo", "Mucho"],
          rows: [{ id: "a", label: "Programar" }, { id: "b", label: "Probar" }],
        },
        { id: "nota", type: "info", label: "Solo texto" },
        { id: "com", type: "long", label: "Comentario" },
      ],
    },
  ],
});

test("la definición se sanea", () => {
  assert.deepEqual(def.pages[0].questions[1].options, ["Sí", "No"]);
  assert.throws(() => parseDefinition({ pages: [{ questions: [{ id: "X", type: "short", label: "a" }] }] }), /código/);
  assert.throws(
    () => parseDefinition({ pages: [{ questions: [{ id: "a", type: "short", label: "a" }, { id: "a", type: "short", label: "b" }] }] }),
    /repetido/,
  );
});

test("acepta un envío válido y descarta claves desconocidas", () => {
  const r = validateAnswers(def, {
    sem: 8, uso: "Otro: a veces", leng: ["Python"], conf: 4, ae: { a: 1, b: 3 }, intruso: "x", nota: "y",
  });
  assert.ok(r.ok);
  assert.deepEqual(Object.keys(r.answers).sort(), ["ae", "conf", "leng", "sem", "uso"]);
});

test("rechaza lo que no cumple", () => {
  const base = { sem: 8, ae: { a: 1, b: 3 } };
  const bad = (patch: object) => assert.equal(validateAnswers(def, { ...base, ...patch }).ok, false);
  bad({ sem: undefined }); // obligatoria
  bad({ sem: 11 }); // fuera de rango
  bad({ sem: "8" }); // tipo
  bad({ uso: "Quizá" }); // opción inexistente
  bad({ leng: ["Python", "Python"] }); // repetida
  bad({ conf: 6 }); // fuera de escala
  bad({ ae: { a: 1 } }); // matriz incompleta
  bad({ ae: { a: 1, b: 4 } }); // columna inexistente
  bad({ ae: { a: 1, b: 3, c: 1 } }); // fila inexistente
  assert.ok(validateAnswers(def, base).ok);
});

test("el CSV aplana la matriz y neutraliza fórmulas", () => {
  const csv = toCsv(def, [
    { id: "r1", created_at: "2026-11-11T00:00:00Z", answers: { sem: 8, leng: ["Python", "Java"], ae: { a: 1, b: 3 }, com: '=1+1, "hola"' } },
  ]);
  const [head, row] = csv.replace("﻿", "").trim().split("\r\n");
  assert.equal(head, "id,fecha,sem,uso,leng,conf,ae_a,ae_b,com");
  assert.equal(row, `r1,2026-11-11T00:00:00.000Z,8,,Python | Java,,1,3,"'=1+1, ""hola"""`);
});

test("el orden aleatorio solo mueve las páginas marcadas y queda en el CSV", () => {
  const page = (id: string, shuffle?: boolean) => ({ title: id, shuffle, questions: [{ id, type: "short", label: id }] });
  const d = parseDefinition({ pages: [page("a"), page("b", true), page("c"), page("d", true), page("e", true)] });
  const seen = new Set<string>();
  for (let i = 0; i < 300; i++) {
    const o = randomOrder(d);
    assert.ok(validOrder(d, o));
    assert.equal(o[0], 0);
    assert.equal(o[2], 2);
    seen.add(o.join(""));
  }
  assert.equal(seen.size, 6); // aparecen las 3! permutaciones de las marcadas
  assert.equal(validOrder(d, [2, 1, 0, 3, 4]), false); // mueve una página fija
  assert.equal(validOrder(d, [0, 1, 2, 3, 3]), false); // repite
  assert.equal(validOrder(d, [0, 1, 2, 3]), false); // falta una
  assert.deepEqual(randomOrder(def), [0]); // sin páginas marcadas no cambia nada
  const csv = toCsv(d, [{ id: "r", created_at: "2026-11-11T00:00:00Z", answers: { _orden: "1-4-3-5-2", a: "x" } }]);
  assert.equal(csv.replace("﻿", "").trim().split("\r\n")[1], "r,2026-11-11T00:00:00.000Z,1-4-3-5-2,x,,,,");
});

test("rechaza códigos reservados y más de un «Otro»", () => {
  assert.throws(() => parseDefinition({ pages: [{ questions: [{ id: "constructor", type: "short", label: "a" }] }] }), /código/);
  const d = parseDefinition({ pages: [{ questions: [{ id: "m", type: "multi", label: "m", options: ["a", "b"], other: true }] }] });
  assert.ok(validateAnswers(d, { m: ["a", "Otro: x"] }).ok);
  assert.equal(validateAnswers(d, { m: ["Otro: x", "Otro: y"] }).ok, false);
  assert.ok(validateAnswers(d, Object.create({ m: ["zzz"] })).ok); // lo heredado no cuenta como respuesta
});
