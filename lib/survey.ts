// Modelo de una encuesta: tipos, saneado de la definición, validación de
// respuestas y exportación a CSV. Sin dependencias, para poder probarlo solo.

export const TYPES = {
  short: "Texto corto",
  long: "Texto largo",
  number: "Número",
  single: "Opción única",
  multi: "Opción múltiple",
  scale: "Escala",
  matrix: "Matriz (varias filas, misma escala)",
  info: "Texto informativo",
} as const;
export type QType = keyof typeof TYPES;

export type Question = {
  id: string;
  type: QType;
  label: string;
  help?: string;
  required?: boolean;
  options?: string[]; // single, multi
  other?: boolean; // single, multi: admite «Otro: …»
  rows?: { id: string; label: string }[]; // matrix
  columns?: string[]; // matrix
  points?: number; // scale
  minLabel?: string;
  maxLabel?: string;
  min?: number; // number
  max?: number;
};
// shuffle: la página cambia de puesto, al azar, con las demás páginas marcadas.
export type Page = { title: string; description?: string; shuffle?: boolean; questions: Question[] };
export type Definition = { intro: string; consent?: string; thanks?: string; pages: Page[] };

export type Answer = string | number | string[] | Record<string, number>;
export type Answers = Record<string, Answer>;

export const OTHER = "Otro: ";
const ID = /^[a-z][a-z0-9_]{0,39}$/;

export const emptyDefinition = (): Definition => ({
  intro: "Cuenta aquí de qué trata la encuesta, quién la hace y cuánto tarda.",
  thanks: "Gracias por responder.",
  pages: [
    {
      title: "Preguntas",
      questions: [{ id: "p1", type: "short", label: "Tu primera pregunta", required: false }],
    },
  ],
});

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, maxItems: number, maxLen: number) =>
  (Array.isArray(v) ? v : [])
    .map((x) => str(x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
const int = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : fallback;
};

/** Convierte lo que llega del editor (o de un JSON importado) en una definición fiable. Lanza Error con mensaje para la persona. */
export function parseDefinition(input: unknown): Definition {
  const src = (input ?? {}) as Record<string, unknown>;
  const pagesIn = Array.isArray(src.pages) ? src.pages : [];
  if (!pagesIn.length) throw new Error("La encuesta necesita al menos una página.");
  if (pagesIn.length > 40) throw new Error("Máximo 40 páginas.");
  const seen = new Set<string>();
  let total = 0;

  const pages = pagesIn.map((p, pi): Page => {
    const page = (p ?? {}) as Record<string, unknown>;
    const questionsIn = Array.isArray(page.questions) ? page.questions : [];
    const questions = questionsIn.map((raw): Question => {
      const s = (raw ?? {}) as Record<string, unknown>;
      const id = str(s.id, 40);
      const where = `Página ${pi + 1}, pregunta «${id || "sin código"}»`;
      if (!ID.test(id)) throw new Error(`${where}: el código debe empezar por letra y usar solo minúsculas, números y guion bajo.`);
      if (seen.has(id)) throw new Error(`${where}: el código está repetido.`);
      seen.add(id);
      const type = str(s.type, 10) as QType;
      if (!(type in TYPES)) throw new Error(`${where}: tipo de pregunta desconocido.`);
      const label = str(s.label, 2000);
      if (!label) throw new Error(`${where}: falta el texto.`);

      const out: Question = { id, type, label };
      const help = str(s.help, 1000);
      if (help) out.help = help;
      if (type !== "info" && s.required === true) out.required = true;

      if (type === "single" || type === "multi") {
        out.options = list(s.options, 60, 300);
        if (out.options.length < 2 && !s.other) throw new Error(`${where}: necesita al menos dos opciones.`);
        if (new Set(out.options).size !== out.options.length) throw new Error(`${where}: hay opciones repetidas.`);
        if (s.other === true) out.other = true;
      }
      if (type === "matrix") {
        out.columns = list(s.columns, 11, 80);
        if (out.columns.length < 2) throw new Error(`${where}: la escala necesita al menos dos columnas.`);
        const rowIds = new Set<string>();
        out.rows = (Array.isArray(s.rows) ? s.rows : []).slice(0, 60).flatMap((r) => {
          const row = (r ?? {}) as Record<string, unknown>;
          const rid = str(row.id, 40);
          const rlabel = str(row.label, 500);
          if (!rid && !rlabel) return [];
          if (!ID.test(rid) || !rlabel) throw new Error(`${where}: revisa la fila «${rid || rlabel}» (código y texto).`);
          if (rowIds.has(rid)) throw new Error(`${where}: la fila «${rid}» está repetida.`);
          rowIds.add(rid);
          return [{ id: rid, label: rlabel }];
        });
        if (!out.rows.length) throw new Error(`${where}: necesita al menos una fila.`);
      }
      if (type === "scale") {
        out.points = int(s.points, 2, 11, 5);
        const lo = str(s.minLabel, 80);
        const hi = str(s.maxLabel, 80);
        if (lo) out.minLabel = lo;
        if (hi) out.maxLabel = hi;
      }
      if (type === "number") {
        if (typeof s.min === "number" && Number.isFinite(s.min)) out.min = s.min;
        if (typeof s.max === "number" && Number.isFinite(s.max)) out.max = s.max;
      }
      total++;
      return out;
    });
    const result: Page = { title: str(page.title, 200) || `Página ${pi + 1}`, questions };
    const description = str(page.description, 4000);
    if (description) result.description = description;
    if (page.shuffle === true) result.shuffle = true;
    return result;
  });

  if (total > 400) throw new Error("Máximo 400 preguntas.");
  const def: Definition = { intro: str(src.intro, 8000), pages };
  const consent = str(src.consent, 1000);
  const thanks = str(src.thanks, 2000);
  if (consent) def.consent = consent;
  if (thanks) def.thanks = thanks;
  return def;
}

export const questions = (def: Definition) => def.pages.flatMap((p) => p.questions);

/** Clave reservada dentro de las respuestas para el orden en que se mostraron las páginas («1-2-4-3»). */
export const ORDER_KEY = "_orden";
export const hasShuffle = (def: Definition) => def.pages.filter((p) => p.shuffle).length > 1;

/** Orden de presentación: las páginas marcadas se barajan entre sus propios puestos; el resto no se mueve. */
export function randomOrder(def: Definition, random: () => number = Math.random): number[] {
  const order = def.pages.map((_, i) => i);
  if (!hasShuffle(def)) return order;
  const slots = order.filter((i) => def.pages[i].shuffle);
  const picked = [...slots];
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  slots.forEach((slot, k) => (order[slot] = picked[k]));
  return order;
}

/** Un orden es válido si usa cada página una vez y solo mueve las marcadas. */
export function validOrder(def: Definition, order: unknown): order is number[] {
  if (!Array.isArray(order) || order.length !== def.pages.length) return false;
  if (new Set(order).size !== order.length) return false;
  const movable = hasShuffle(def);
  return order.every(
    (p, i) =>
      Number.isInteger(p) && p >= 0 && p < def.pages.length &&
      (p === i || (movable && def.pages[i].shuffle === true && def.pages[p].shuffle === true)),
  );
}
export const orderLabel = (order: number[]) => order.map((i) => i + 1).join("-");

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

const choiceOk = (q: Question, v: unknown) =>
  typeof v === "string" && (q.options!.includes(v) || (q.other === true && v.startsWith(OTHER) && v.length > OTHER.length && v.length <= 300));

/** Devuelve el mensaje de error de una pregunta, o null si su respuesta es válida. Lo usan el formulario y el servidor. */
export function checkAnswer(q: Question, v: unknown): string | null {
  if (q.type === "info") return null;
  if (isEmpty(v)) return q.required ? "Esta pregunta es obligatoria." : null;
  switch (q.type) {
    case "short":
      return typeof v === "string" && v.length <= 500 ? null : "Máximo 500 caracteres.";
    case "long":
      return typeof v === "string" && v.length <= 5000 ? null : "Máximo 5000 caracteres.";
    case "number":
      if (typeof v !== "number" || !Number.isFinite(v)) return "Escribe un número.";
      if (q.min !== undefined && v < q.min) return `El mínimo es ${q.min}.`;
      if (q.max !== undefined && v > q.max) return `El máximo es ${q.max}.`;
      return null;
    case "single":
      return choiceOk(q, v) ? null : "Elige una de las opciones.";
    case "multi":
      return Array.isArray(v) && new Set(v).size === v.length && v.every((x) => choiceOk(q, x)) ? null : "Elige entre las opciones.";
    case "scale":
      return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= q.points! ? null : "Elige un valor de la escala.";
    case "matrix": {
      if (typeof v !== "object" || Array.isArray(v)) return "Respuesta no válida.";
      const m = v as Record<string, unknown>;
      const ids = q.rows!.map((r) => r.id);
      const ok = Object.entries(m).every(([k, n]) => ids.includes(k) && Number.isInteger(n) && (n as number) >= 1 && (n as number) <= q.columns!.length);
      if (!ok) return "Respuesta no válida.";
      return q.required && ids.some((id) => !(id in m)) ? "Responde todas las filas." : null;
    }
  }
}

/** Valida un envío completo y devuelve solo las respuestas de preguntas que existen. */
export function validateAnswers(def: Definition, raw: unknown): { ok: true; answers: Answers } | { ok: false; error: string } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const answers: Answers = {};
  for (const q of questions(def)) {
    const v = typeof input[q.id] === "string" ? (input[q.id] as string).trim() : input[q.id];
    const error = checkAnswer(q, v);
    if (error) return { ok: false, error: `«${q.label.slice(0, 60)}»: ${error}` };
    if (q.type !== "info" && !isEmpty(v)) answers[q.id] = v as Answer;
  }
  return { ok: true, answers };
}

/** Columnas del CSV: una por pregunta y una por fila de cada matriz. */
export function csvColumns(def: Definition): { key: string; get: (a: Answers) => Answer | undefined }[] {
  type Col = { key: string; get: (a: Answers) => Answer | undefined };
  return questions(def).flatMap((q): Col[] => {
    if (q.type === "info") return [];
    if (q.type === "matrix")
      return q.rows!.map((r) => ({
        key: `${q.id}_${r.id}`,
        get: (a: Answers) => (a[q.id] as Record<string, number> | undefined)?.[r.id],
      }));
    return [{ key: q.id, get: (a: Answers) => a[q.id] }];
  });
}

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : Array.isArray(v) ? v.join(" | ") : String(v);
  // El apóstrofo inicial evita que Excel ejecute como fórmula un texto escrito por quien responde.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v !== "number" ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(def: Definition, rows: { id: string; created_at: string | Date; answers: Answers }[]): string {
  const cols = csvColumns(def);
  const meta = hasShuffle(def) ? ["orden_paginas"] : [];
  const lines = [["id", "fecha", ...meta, ...cols.map((c) => c.key)].join(",")];
  for (const r of rows)
    lines.push(
      [r.id, new Date(r.created_at).toISOString(), ...meta.map(() => cell(r.answers[ORDER_KEY])), ...cols.map((c) => cell(c.get(r.answers)))].join(","),
    );
  return "﻿" + lines.join("\r\n") + "\r\n";
}
