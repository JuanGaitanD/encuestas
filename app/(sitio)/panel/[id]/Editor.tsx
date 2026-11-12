"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { addEditor, deleteSurvey, removeEditor, saveSurvey, setPublished } from "@/app/actions";
import { Field } from "@/app/Fields";
import { Icon, type IconName } from "@/app/Icon";
import { TYPES, type Answer, type Definition, type Page, type QType, type Question } from "@/lib/survey";

type Survey = { id: string; title: string; slug: string; published: boolean; definition: Definition; owner: boolean; version: string };
type Person = { id: string; name: string; email: string };

const HINTS: Record<QType, string> = {
  short: "Una línea: un nombre, una ciudad.",
  long: "Varias líneas: una opinión, un comentario.",
  number: "Una cifra, con mínimo y máximo si quieres.",
  single: "Elige una sola de la lista.",
  select: "Una sola, en una lista que se despliega. Útil si hay muchas.",
  multi: "Puede marcar varias de la lista.",
  scale: "Del 1 al 5 (o los puntos que quieras).",
  matrix: "Varias frases que se responden con la misma escala.",
  info: "Un texto para explicar algo; no se responde.",
};
const PRESETS: [string, string[]][] = [
  ["Acuerdo", ["Muy en desacuerdo", "En desacuerdo", "Ni de acuerdo ni en desacuerdo", "De acuerdo", "Muy de acuerdo"]],
  ["Frecuencia", ["Nunca", "Rara vez", "A veces", "Casi siempre", "Siempre"]],
  ["Intensidad", ["Nada", "Poco", "Algo", "Bastante", "Mucho"]],
  ["Satisfacción", ["Muy insatisfecho", "Insatisfecho", "Neutral", "Satisfecho", "Muy satisfecho"]],
];

const move = <T,>(arr: T[], i: number, d: number) => {
  const out = [...arr];
  const j = i + d;
  if (j < 0 || j >= out.length) return out;
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

/** Lista editable: un campo por elemento, Enter añade el siguiente. */
function ListEditor(p: { items: string[]; placeholder: string; addLabel: string; onEdit: (i: number, text: string) => void; onAdd: () => void; onRemove: (i: number) => void; min?: number }) {
  const focusLast = useRef(false);
  return (
    <div className="listeditor">
      {p.items.map((text, i) => (
        <div key={i} className="lerow">
          <span className="lenum" aria-hidden="true">{i + 1}</span>
          <input
            value={text}
            placeholder={p.placeholder}
            aria-label={`${p.placeholder} ${i + 1}`}
            autoFocus={focusLast.current && i === p.items.length - 1}
            onChange={(e) => p.onEdit(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              focusLast.current = true;
              p.onAdd();
            }}
          />
          <button type="button" className="iconbtn" aria-label={`Quitar ${i + 1}`} disabled={p.items.length <= (p.min ?? 1)} onClick={() => p.onRemove(i)}>
            <Icon name="close" size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn text"
        onClick={() => {
          focusLast.current = true;
          p.onAdd();
        }}
      >
        <Icon name="plus" size={18} /> {p.addLabel}
      </button>
    </div>
  );
}

function Switch({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true" />
      <span>{children}</span>
    </label>
  );
}

function QuestionCard(p: {
  qu: Question;
  n: number;
  open: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  set: (patch: Partial<Question>) => void;
  onType: (t: QType) => void;
  onMove: (d: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { qu, set } = p;
  const [sample, setSample] = useState<Answer | undefined>();
  const options = qu.options ?? [];
  const columns = qu.columns ?? [];
  const rows = qu.rows ?? [];
  const without = <T,>(arr: T[], i: number) => arr.filter((_, k) => k !== i);
  const withAt = <T,>(arr: T[], i: number, v: T) => arr.map((x, k) => (k === i ? v : x));
  const nextRowId = () => {
    let n = rows.length + 1;
    while (rows.some((r) => r.id === `f${n}`)) n++;
    return `f${n}`;
  };

  if (!p.open)
    return (
      <button type="button" className="qcard closed" onClick={p.onToggle} aria-expanded="false">
        <span className="qtype">
          <Icon name={qu.type as IconName} />
        </span>
        <span className="qsum">
          <span className="qsumtext">{qu.label || "Pregunta sin texto"}</span>
          <span className="qmeta">
            {TYPES[qu.type]}
            {qu.required ? " · obligatoria" : ""}
          </span>
        </span>
        <Icon name="chevron" />
      </button>
    );

  return (
    <div className="qcard open">
      <div className="qbar">
        <label className="typepick">
          <span className="sr">Tipo de pregunta</span>
          <Icon name={qu.type as IconName} />
          <select value={qu.type} onChange={(e) => p.onType(e.target.value as QType)}>
            {Object.entries(TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="qactions">
          <button type="button" className="iconbtn" aria-label="Duplicar pregunta" title="Duplicar" onClick={p.onDuplicate}>
            <Icon name="copy" size={18} />
          </button>
          <button type="button" className="iconbtn" aria-label="Subir pregunta" title="Subir" disabled={p.first} onClick={() => p.onMove(-1)}>
            <Icon name="up" size={18} />
          </button>
          <button type="button" className="iconbtn" aria-label="Bajar pregunta" title="Bajar" disabled={p.last} onClick={() => p.onMove(1)}>
            <Icon name="down" size={18} />
          </button>
          <button type="button" className="iconbtn danger" aria-label="Borrar pregunta" title="Borrar" onClick={p.onDelete}>
            <Icon name="trash" size={18} />
          </button>
          <button type="button" className="iconbtn" aria-label="Plegar pregunta" title="Plegar" onClick={p.onToggle}>
            <Icon name="chevron" size={18} />
          </button>
        </div>
      </div>

      <label>
        {qu.type === "info" ? "Texto que se mostrará" : "Pregunta"}
        <textarea rows={2} value={qu.label} autoFocus={!qu.label} placeholder={qu.type === "info" ? "Escribe la explicación" : "Escribe la pregunta"} onChange={(e) => set({ label: e.target.value })} />
      </label>
      {qu.type !== "info" && (
        <label>
          <span>Aclaración <span className="optional">(opcional)</span></span>
          <input value={qu.help ?? ""} placeholder="Una pista corta que aparece debajo de la pregunta" onChange={(e) => set({ help: e.target.value })} />
        </label>
      )}

      {(qu.type === "single" || qu.type === "multi" || qu.type === "select") && (
        <fieldset className="group">
          <legend>Opciones</legend>
          <ListEditor
            items={options}
            placeholder="Opción"
            addLabel="Añadir opción"
            min={qu.other ? 1 : 2}
            onEdit={(i, t) => set({ options: withAt(options, i, t) })}
            onAdd={() => set({ options: [...options, ""] })}
            onRemove={(i) => set({ options: without(options, i) })}
          />
          {qu.type !== "select" && (
            <Switch checked={!!qu.other} onChange={(v) => set({ other: v })}>
              Añadir «Otro» con espacio para escribir
            </Switch>
          )}
        </fieldset>
      )}

      {qu.type === "matrix" && (
        <>
          <fieldset className="group">
            <legend>Frases o aspectos (filas)</legend>
            <ListEditor
              items={rows.map((r) => r.label)}
              placeholder="Frase"
              addLabel="Añadir fila"
              onEdit={(i, t) => set({ rows: withAt(rows, i, { ...rows[i], label: t }) })}
              onAdd={() => set({ rows: [...rows, { id: nextRowId(), label: "" }] })}
              onRemove={(i) => set({ rows: without(rows, i) })}
            />
          </fieldset>
          <fieldset className="group">
            <legend>Escala de respuesta (columnas)</legend>
            <div className="presets">
              <span className="muted">Usar una escala habitual:</span>
              {PRESETS.map(([name, cols]) => (
                <button key={name} type="button" className="chip" onClick={() => set({ columns: cols })}>
                  {name}
                </button>
              ))}
            </div>
            <ListEditor
              items={columns}
              placeholder="Nivel"
              addLabel="Añadir nivel"
              min={2}
              onEdit={(i, t) => set({ columns: withAt(columns, i, t) })}
              onAdd={() => columns.length < 11 && set({ columns: [...columns, ""] })}
              onRemove={(i) => set({ columns: without(columns, i) })}
            />
          </fieldset>
        </>
      )}

      {qu.type === "scale" && (
        <div className="fieldrow">
          <label className="narrow">
            Puntos
            <input type="number" min={2} max={11} value={qu.points ?? 5} onChange={(e) => set({ points: Math.max(2, Math.min(11, Number(e.target.value) || 5)) })} />
          </label>
          <label>
            Qué significa el 1
            <input value={qu.minLabel ?? ""} placeholder="Nada" onChange={(e) => set({ minLabel: e.target.value })} />
          </label>
          <label>
            Qué significa el {qu.points ?? 5}
            <input value={qu.maxLabel ?? ""} placeholder="Mucho" onChange={(e) => set({ maxLabel: e.target.value })} />
          </label>
        </div>
      )}

      {qu.type === "number" && (
        <div className="fieldrow">
          <label>
            <span>Mínimo <span className="optional">(opcional)</span></span>
            <input type="number" value={qu.min ?? ""} onChange={(e) => set({ min: e.target.value === "" ? undefined : Number(e.target.value) })} />
          </label>
          <label>
            <span>Máximo <span className="optional">(opcional)</span></span>
            <input type="number" value={qu.max ?? ""} onChange={(e) => set({ max: e.target.value === "" ? undefined : Number(e.target.value) })} />
          </label>
        </div>
      )}

      {qu.type !== "info" && (
        <>
          <Switch checked={!!qu.required} onChange={(v) => set({ required: v })}>
            Obligatoria: no se puede avanzar sin responderla
          </Switch>

          <div className="preview">
            <p className="previewtag">
              <Icon name="eye" size={16} /> Así la verá quien responde
            </p>
            <div className="q">
              <div className="qhead">
                <p className="qlabel">
                  {qu.label || "Escribe la pregunta"}
                  {!qu.required && <span className="optional"> (opcional)</span>}
                </p>
                {qu.help && <p className="qhelp">{qu.help}</p>}
              </div>
              <Field
                qu={{ ...qu, id: `prev_${qu.id}`, options: options.filter(Boolean), columns: columns.filter(Boolean), rows: rows.filter((r) => r.label) }}
                value={sample}
                set={setSample}
              />
            </div>
          </div>

          <details className="advanced">
            <summary>Opciones avanzadas</summary>
            <div className="stack">
              <label className="narrow">
                Código de la pregunta
                <input className="mono" value={qu.id} maxLength={40} onChange={(e) => set({ id: e.target.value.toLowerCase() })} />
                <small>Es el nombre de la columna en el CSV. Minúsculas, números y guion bajo; debe empezar por letra.</small>
              </label>
              {qu.type === "matrix" && rows.length > 0 && (
                <fieldset className="group">
                  <legend>Código de cada fila</legend>
                  <small>La columna del CSV se llama «{qu.id}_código».</small>
                  {rows.map((r, i) => (
                    <label key={i} className="coderow">
                      <span>{r.label || `Fila ${i + 1}`}</span>
                      <input className="mono" value={r.id} maxLength={40} aria-label={`Código de la fila ${i + 1}`} onChange={(e) => set({ rows: withAt(rows, i, { ...r, id: e.target.value.toLowerCase() }) })} />
                    </label>
                  ))}
                </fieldset>
              )}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

export function Editor({ survey, editors: initialEditors }: { survey: Survey; editors: Person[] }) {
  const [title, setTitle] = useState(survey.title);
  const [slug, setSlug] = useState(survey.slug);
  const [def, setDef] = useState(survey.definition);
  const [published, setPub] = useState(survey.published);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<string | null>(null); // «página:pregunta» desplegada
  const [adding, setAdding] = useState<number | null>(null); // página con el selector de tipo abierto
  const [json, setJson] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  // Versión abierta: si otra persona guarda después, el servidor avisa en vez de pisar su trabajo.
  const [version, setVersion] = useState(survey.version);
  const [conflict, setConflict] = useState(false);
  const leaving = useRef(false);
  const [editors, setEditors] = useState(initialEditors);
  const [invite, setInvite] = useState("");
  const [inviteError, setInviteError] = useState("");

  // El dominio solo se conoce en el navegador; se completa tras montar para no romper la hidratación.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/e/${survey.slug}`;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => void (leaving.current || e.preventDefault());
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setStatus(null);
  };
  const change = (next: Definition) => {
    setDef(next);
    touch();
  };
  const setPage = (pi: number, patch: Partial<Page>) => change({ ...def, pages: def.pages.map((p, i) => (i === pi ? { ...p, ...patch } : p)) });
  const setQ = (pi: number, qi: number, patch: Partial<Question>) =>
    setPage(pi, { questions: def.pages[pi].questions.map((x, i) => (i === qi ? { ...x, ...patch } : x)) });
  const freeId = (base = "p") => {
    const used = new Set(def.pages.flatMap((p) => p.questions.map((x) => x.id)));
    let n = used.size + 1;
    while (used.has(`${base}${n}`)) n++;
    return `${base}${n}`;
  };
  const blank = (type: QType): Question => {
    const q: Question = { id: freeId(), type, label: "" };
    if (type === "single" || type === "multi" || type === "select") q.options = ["", ""];
    if (type === "matrix") {
      q.columns = PRESETS[0][1];
      q.rows = [{ id: "f1", label: "" }];
    }
    if (type === "scale") q.points = 5;
    return q;
  };
  const addQuestion = (pi: number, type: QType) => {
    setPage(pi, { questions: [...def.pages[pi].questions, blank(type)] });
    setOpen(`${pi}:${def.pages[pi].questions.length}`);
    setAdding(null);
  };
  const changeType = (pi: number, qi: number, type: QType) => {
    const cur = def.pages[pi].questions[qi];
    const fresh = blank(type);
    setQ(pi, qi, { type, options: cur.options ?? fresh.options, columns: cur.columns ?? fresh.columns, rows: cur.rows ?? fresh.rows, points: cur.points ?? fresh.points });
  };

  // Antes de guardar se quitan las filas y opciones que quedaron vacías en el editor.
  const tidy = (d: Definition): Definition => ({
    ...d,
    pages: d.pages.map((p) => ({
      ...p,
      questions: p.questions.map((x) => ({ ...x, options: x.options?.filter((o) => o.trim()), columns: x.columns?.filter((c) => c.trim()), rows: x.rows?.filter((r) => r.label.trim()) })),
    })),
  });
  const persist = async (force = false) => {
    const r = await saveSurvey(survey.id, title, slug, tidy(def), force ? null : version);
    setConflict(!r.ok && !!r.conflict);
    if (r.ok) {
      setDirty(false);
      setVersion(r.version);
    } else setStatus({ kind: "error", text: r.error });
    return r.ok;
  };
  const people = (action: Promise<{ ok: true; editors: Person[] } | { ok: false; error: string }>) =>
    start(async () => {
      const r = await action;
      setInviteError(r.ok ? "" : r.error);
      if (r.ok) {
        setEditors(r.editors);
        setInvite("");
      }
    });
  const save = (force = false) => start(async () => void ((await persist(force)) && setStatus({ kind: "ok", text: "Cambios guardados." })));
  const togglePublish = () =>
    start(async () => {
      if (dirty && !(await persist())) return;
      await setPublished(survey.id, !published);
      setPub(!published);
      setStatus({ kind: "ok", text: published ? "La encuesta dejó de recibir respuestas." : "Publicada. Ya puedes compartir el enlace." });
    });
  const applyJson = () => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || !Array.isArray(parsed.pages)) throw new Error("no tiene la lista «pages».");
      change(parsed);
      setOpen(null);
      setStatus({ kind: "ok", text: "JSON cargado. Revisa y guarda." });
    } catch (e) {
      setStatus({ kind: "error", text: `No se pudo leer el JSON: ${(e as Error).message}` });
    }
  };

  const total = def.pages.reduce((n, p) => n + p.questions.filter((x) => x.type !== "info").length, 0);
  let counter = 0;

  return (
    <div className="editor stack">
      <div className="crumbs">
        <Link href="/panel" className="textlink">
          <Icon name="back" size={18} /> Mis encuestas
        </Link>
        <div className="row">
          <Link href={`/panel/${survey.id}/respuestas`} className="btn ghost small">
            Respuestas
          </Link>
          <a href={`/e/${survey.slug}`} target="_blank" className="btn ghost small">
            Vista previa <Icon name="external" size={18} />
          </a>
        </div>
      </div>

      <section className="panel stack">
        <h2>Datos generales</h2>
        <label>
          Título
          <input value={title} maxLength={200} onChange={(e) => (setTitle(e.target.value), touch())} />
        </label>
        <label>
          Dirección del enlace
          <span className="affix">
            <span className="prefix">/e/</span>
            <input value={slug} maxLength={60} disabled={published} onChange={(e) => (setSlug(e.target.value.toLowerCase()), touch())} />
          </span>
          <small>
            {published
              ? "Mientras está publicada no se puede cambiar: quien ya tiene el enlace llegaría a otro sitio."
              : "Minúsculas, números y guiones. Elígela antes de publicar; después queda fija."}
          </small>
        </label>
        <label>
          Presentación
          <textarea rows={5} value={def.intro} onChange={(e) => change({ ...def, intro: e.target.value })} />
          <small>Lo primero que ve la persona: de qué trata, quién la hace, cuánto tarda y qué pasa con sus datos.</small>
        </label>
        <label>
          <span>Consentimiento <span className="optional">(opcional)</span></span>
          <input value={def.consent ?? ""} placeholder="He leído la información y acepto participar." onChange={(e) => change({ ...def, consent: e.target.value })} />
          <small>Si lo escribes, aparece como casilla que hay que marcar para empezar.</small>
        </label>
        <label>
          Mensaje al terminar
          <input value={def.thanks ?? ""} onChange={(e) => change({ ...def, thanks: e.target.value })} />
        </label>
      </section>

      <div className="sectionhead">
        <h2>Preguntas</h2>
        <span className="muted">
          {total} {total === 1 ? "pregunta" : "preguntas"} en {def.pages.length} {def.pages.length === 1 ? "página" : "páginas"}
        </span>
      </div>

      {def.pages.map((page, pi) => (
        <section key={pi} className="page stack">
          <div className="pagebar">
            <span className="pagenum">Página {pi + 1}</span>
            <div className="qactions">
              <button type="button" className="iconbtn" aria-label="Subir página" title="Subir página" disabled={pi === 0} onClick={() => (change({ ...def, pages: move(def.pages, pi, -1) }), setOpen(null))}>
                <Icon name="up" size={18} />
              </button>
              <button type="button" className="iconbtn" aria-label="Bajar página" title="Bajar página" disabled={pi === def.pages.length - 1} onClick={() => (change({ ...def, pages: move(def.pages, pi, 1) }), setOpen(null))}>
                <Icon name="down" size={18} />
              </button>
              <button
                type="button"
                className="iconbtn danger"
                aria-label="Borrar página"
                title="Borrar página"
                disabled={def.pages.length === 1}
                onClick={() => confirm(`¿Borrar la página ${pi + 1} y sus ${page.questions.length} preguntas?`) && (change({ ...def, pages: def.pages.filter((_, i) => i !== pi) }), setOpen(null))}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          </div>
          <div className="fieldrow">
            <label>
              Título de la página
              <input value={page.title} onChange={(e) => setPage(pi, { title: e.target.value })} />
            </label>
            <label>
              <span>Descripción <span className="optional">(opcional)</span></span>
              <textarea rows={1} value={page.description ?? ""} onChange={(e) => setPage(pi, { description: e.target.value })} />
            </label>
          </div>
          {def.pages.length > 1 && (
            <div>
              <Switch checked={!!page.shuffle} onChange={(v) => setPage(pi, { shuffle: v })}>
                Orden aleatorio: intercambia su puesto, al azar, con las demás páginas marcadas
              </Switch>
              {page.shuffle && (
                <small className="hint">
                  {def.pages.filter((p) => p.shuffle).length < 2
                    ? "Marca al menos otra página para que haya con cuál intercambiarla."
                    : "Cada persona verá las páginas marcadas en un orden sorteado, que queda en la columna «orden_paginas» del CSV."}
                </small>
              )}
            </div>
          )}

          {page.questions.length === 0 && <p className="emptyq">Esta página no tiene preguntas todavía.</p>}
          <div className="qlist">
            {page.questions.map((qu, qi) => (
              <QuestionCard
                key={qi}
                qu={qu}
                n={qu.type === "info" ? 0 : ++counter}
                open={open === `${pi}:${qi}`}
                first={qi === 0}
                last={qi === page.questions.length - 1}
                onToggle={() => setOpen(open === `${pi}:${qi}` ? null : `${pi}:${qi}`)}
                set={(patch) => setQ(pi, qi, patch)}
                onType={(t) => changeType(pi, qi, t)}
                onMove={(d) => (setPage(pi, { questions: move(page.questions, qi, d) }), setOpen(`${pi}:${qi + d}`))}
                onDuplicate={() => {
                  const copy = { ...structuredClone(qu), id: freeId(qu.id.replace(/\d+$/, "") || "p") };
                  setPage(pi, { questions: [...page.questions.slice(0, qi + 1), copy, ...page.questions.slice(qi + 1)] });
                  setOpen(`${pi}:${qi + 1}`);
                }}
                onDelete={() => (setPage(pi, { questions: page.questions.filter((_, i) => i !== qi) }), setOpen(null))}
              />
            ))}
          </div>

          {adding === pi ? (
            <div className="typegrid" role="group" aria-label="Elige el tipo de pregunta">
              <div className="typegridhead">
                <strong>¿Qué tipo de pregunta quieres añadir?</strong>
                <button type="button" className="iconbtn" aria-label="Cancelar" onClick={() => setAdding(null)}>
                  <Icon name="close" size={18} />
                </button>
              </div>
              {(Object.keys(TYPES) as QType[]).map((t) => (
                <button key={t} type="button" className="typebtn" onClick={() => addQuestion(pi, t)}>
                  <Icon name={t as IconName} />
                  <span>
                    <strong>{TYPES[t]}</strong>
                    <small>{HINTS[t]}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="btn dashed" onClick={() => setAdding(pi)}>
              <Icon name="plus" /> Añadir pregunta
            </button>
          )}
        </section>
      ))}

      <button type="button" className="btn ghost" onClick={() => change({ ...def, pages: [...def.pages, { title: `Página ${def.pages.length + 1}`, questions: [] }] })}>
        <Icon name="plus" /> Añadir página
      </button>

      <details className="panel">
        <summary>Importar o exportar la encuesta como JSON</summary>
        <div className="stack">
          <p className="muted">Sirve para copiar una encuesta entre cuentas o versionarla junto a un estudio.</p>
          <textarea rows={10} className="mono" value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} aria-label="JSON de la encuesta" placeholder="Pega aquí un JSON, o pulsa «Ver el JSON actual»." />
          <div className="row">
            <button type="button" className="btn ghost small" onClick={() => setJson(JSON.stringify(tidy(def), null, 2))}>
              Ver el JSON actual
            </button>
            <button type="button" className="btn ghost small" onClick={applyJson} disabled={!json.trim()}>
              Cargar este JSON en el editor
            </button>
          </div>
        </div>
      </details>

      {survey.owner ? (
        <details className="panel">
          <summary>Personas que pueden editar ({editors.length + 1})</summary>
          <div className="stack">
            <p className="muted">
              Quien añadas podrá cambiar las preguntas, publicar, ver las respuestas y borrarlas. Solo tú puedes borrar la encuesta y decidir quién la edita. La
              otra persona necesita una cuenta aquí.
            </p>
            {editors.length > 0 && (
              <ul className="records">
                {editors.map((p) => (
                  <li key={p.id}>
                    <span className="grow">
                      {p.name} <span className="muted">{p.email}</span>
                    </span>
                    <button type="button" className="iconbtn danger" aria-label={`Quitar a ${p.name}`} title="Quitar" disabled={pending} onClick={() => people(removeEditor(survey.id, p.id))}>
                      <Icon name="close" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="inviterow"
              onSubmit={(e) => {
                e.preventDefault();
                people(addEditor(survey.id, invite));
              }}
            >
              <label className="grow">
                Correo de su cuenta
                <input type="email" required value={invite} autoComplete="off" aria-invalid={inviteError ? true : undefined} aria-describedby="invite-error" onChange={(e) => setInvite(e.target.value)} />
              </label>
              <button className="btn ghost" disabled={pending}>
                <Icon name="plus" size={18} /> Añadir
              </button>
            </form>
            <p className="error" id="invite-error" role="alert">
              {inviteError}
            </p>
          </div>
        </details>
      ) : (
        <p className="muted">Editas esta encuesta porque quien la creó te dio acceso. Solo esa persona puede borrarla o añadir a alguien más.</p>
      )}

      {survey.owner && (
      <details className="panel">
        <summary>Borrar la encuesta</summary>
        <div className="stack">
          <p className="muted">Se borran también todas sus respuestas. No se puede deshacer.</p>
          <div>
            <button type="button" className="btn danger small" onClick={() => confirm("¿Borrar la encuesta y todas sus respuestas? No se puede deshacer.") && start(() => deleteSurvey(survey.id))}>
              <Icon name="trash" size={18} /> Borrar definitivamente
            </button>
          </div>
        </div>
      </details>
      )}

      <div className="savebar">
        <div className="grow">
          {status ? (
            <span className={status.kind === "error" ? "error" : "ok"} role="status">
              {status.text}
            </span>
          ) : dirty ? (
            <span className="muted">Hay cambios sin guardar.</span>
          ) : published ? (
            <span className="sharelink">
              <span className="muted">Publicada en</span> <span className="url">{link}</span>
              <button
                type="button"
                className="btn text small"
                onClick={() => navigator.clipboard.writeText(link).then(() => (setCopied(true), setTimeout(() => setCopied(false), 2000)))}
              >
                <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Copiado" : "Copiar"}
              </button>
            </span>
          ) : (
            <span className="muted">Borrador: solo tú puedes verla.</span>
          )}
        </div>
        {conflict ? (
          <>
            <button type="button" className="btn ghost small" disabled={pending} onClick={() => ((leaving.current = true), window.location.reload())}>
              Cargar su versión
            </button>
            <button type="button" className="btn small" disabled={pending} onClick={() => confirm("Se perderá lo que guardó la otra persona. ¿Guardar tu versión encima?") && save(true)}>
              Guardar la mía
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn ghost small" onClick={togglePublish} disabled={pending}>
              {published ? "Dejar de publicar" : "Publicar"}
            </button>
            <button type="button" className="btn small" onClick={() => save()} disabled={pending || !dirty} aria-busy={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
