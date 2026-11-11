// node --test lib/survey.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDefinition, toCsv, validateAnswers } from "./survey.ts";

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
