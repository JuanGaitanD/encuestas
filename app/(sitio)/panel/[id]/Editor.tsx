"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { deleteSurvey, saveSurvey, setPublished } from "@/app/actions";
import { TYPES, type Definition, type Page, type QType, type Question } from "@/lib/survey";

type Survey = { id: string; title: string; slug: string; published: boolean; definition: Definition };

// Filas de una matriz como texto: una por línea, «código | texto» o solo «texto».
const rowsToText = (rows: Question["rows"] = []) =>
  rows.map((r, i) => (r.id === `f${i + 1}` ? r.label : `${r.id} | ${r.label}`)).join("\n");
const textToRows = (text: string) =>
  text.split("\n").map((line, i) => {
    const cut = line.indexOf(" | ");
    return cut > 0 ? { id: line.slice(0, cut).trim(), label: line.slice(cut + 3) } : { id: `f${i + 1}`, label: line };
  });

export function Editor({ survey }: { survey: Survey }) {
  const [title, setTitle] = useState(survey.title);
  const [slug, setSlug] = useState(survey.slug);
  const [def, setDef] = useState(survey.definition);
  const [published, setPub] = useState(survey.published);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [json, setJson] = useState("");
  const [pending, start] = useTransition();

  const change = (next: Definition) => {
    setDef(next);
    setDirty(true);
    setStatus(null);
  };
  const setPage = (pi: number, patch: Partial<Page>) =>
    change({ ...def, pages: def.pages.map((p, i) => (i === pi ? { ...p, ...patch } : p)) });
  const setQ = (pi: number, qi: number, patch: Partial<Question>) =>
    setPage(pi, { questions: def.pages[pi].questions.map((x, i) => (i === qi ? { ...x, ...patch } : x)) });
  const move = <T,>(arr: T[], i: number, d: number) => {
    const out = [...arr];
    const j = i + d;
    if (j < 0 || j >= out.length) return out;
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  };
  const nextId = () => {
    const used = new Set(def.pages.flatMap((p) => p.questions.map((x) => x.id)));
    let n = used.size + 1;
    while (used.has(`p${n}`)) n++;
    return `p${n}`;
  };
  const addQuestion = (pi: number) =>
    setPage(pi, { questions: [...def.pages[pi].questions, { id: nextId(), type: "short", label: "" }] });
  const changeType = (pi: number, qi: number, type: QType) => {
    const patch: Partial<Question> = { type };
    const cur = def.pages[pi].questions[qi];
    if ((type === "single" || type === "multi") && !cur.options) patch.options = ["Opción 1", "Opción 2"];
    if (type === "matrix" && !cur.columns) {
      patch.columns = ["Muy en desacuerdo", "En desacuerdo", "Ni de acuerdo ni en desacuerdo", "De acuerdo", "Muy de acuerdo"];
      patch.rows = [{ id: "f1", label: "Primera afirmación" }];
    }
    if (type === "scale" && !cur.points) patch.points = 5;
    setQ(pi, qi, patch);
  };

  const save = () =>
    start(async () => {
      const r = await saveSurvey(survey.id, title, slug, def);
      if (r.ok) setDirty(false);
      setStatus(r.ok ? { kind: "ok", text: "Guardado." } : { kind: "error", text: r.error });
    });
  const togglePublish = () =>
    start(async () => {
      if (dirty) {
        const r = await saveSurvey(survey.id, title, slug, def);
        if (!r.ok) return setStatus({ kind: "error", text: r.error });
        setDirty(false);
      }
      await setPublished(survey.id, !published);
      setPub(!published);
      setStatus({ kind: "ok", text: published ? "La encuesta dejó de recibir respuestas." : "Publicada. Ya puedes compartir el enlace." });
    });
  const applyJson = () => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || !Array.isArray(parsed.pages)) throw new Error("El JSON no tiene la lista «pages».");
      change(parsed);
      setStatus({ kind: "ok", text: "JSON cargado. Revisa y guarda." });
    } catch (e) {
      setStatus({ kind: "error", text: `No se pudo leer el JSON: ${(e as Error).message}` });
    }
  };

  // El dominio solo se conoce en el navegador; se completa tras montar para no romper la hidratación.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/e/${survey.slug}`;

  return (
    <div className="stack">
      <div className="row between">
        <Link href="/panel">← Mis encuestas</Link>
        <div className="row">
          <Link href={`/panel/${survey.id}/respuestas`}>Respuestas</Link>
          <a href={`/e/${survey.slug}`} target="_blank">
            Vista previa
          </a>
        </div>
      </div>

      <section className="card stack">
        <label>
          Título
          <input value={title} maxLength={200} onChange={(e) => (setTitle(e.target.value), setDirty(true))} />
        </label>
        <label>
          Dirección del enlace
          <span className="row tight">
            <span className="muted">/e/</span>
            <input value={slug} maxLength={60} onChange={(e) => (setSlug(e.target.value), setDirty(true))} />
          </span>
          <small>Minúsculas, números y guiones. Si la cambias, el enlace anterior deja de funcionar.</small>
        </label>
        <label>
          Presentación
          <textarea rows={5} value={def.intro} onChange={(e) => change({ ...def, intro: e.target.value })} />
          <small>Lo primero que ve la persona: de qué trata, quién la hace, cuánto tarda y qué pasa con sus datos.</small>
        </label>
        <label>
          Consentimiento (opcional)
          <input
            value={def.consent ?? ""}
            placeholder="He leído la información y acepto participar."
            onChange={(e) => change({ ...def, consent: e.target.value })}
          />
          <small>Si lo escribes, aparece como casilla que hay que marcar para empezar.</small>
        </label>
        <label>
          Mensaje al terminar
          <input value={def.thanks ?? ""} onChange={(e) => change({ ...def, thanks: e.target.value })} />
        </label>
      </section>

      {def.pages.map((page, pi) => (
        <section key={pi} className="card stack">
          <div className="row between">
            <h2>Página {pi + 1}</h2>
            <div className="row tight">
              <button className="icon" title="Subir página" onClick={() => change({ ...def, pages: move(def.pages, pi, -1) })}>↑</button>
              <button className="icon" title="Bajar página" onClick={() => change({ ...def, pages: move(def.pages, pi, 1) })}>↓</button>
              <button
                className="icon danger"
                title="Borrar página"
                disabled={def.pages.length === 1}
                onClick={() => confirm("¿Borrar la página y sus preguntas?") && change({ ...def, pages: def.pages.filter((_, i) => i !== pi) })}
              >
                ✕
              </button>
            </div>
          </div>
          <label>
            Título de la página
            <input value={page.title} onChange={(e) => setPage(pi, { title: e.target.value })} />
          </label>
          <label>
            Descripción (opcional)
            <textarea rows={2} value={page.description ?? ""} onChange={(e) => setPage(pi, { description: e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={!!page.shuffle} onChange={(e) => setPage(pi, { shuffle: e.target.checked })} />
            Orden aleatorio: esta página intercambia su puesto, al azar, con las demás páginas marcadas
          </label>
          {page.shuffle && (
            <small>
              {def.pages.filter((p) => p.shuffle).length < 2
                ? "Marca al menos otra página para que haya con cuál intercambiarla."
                : "Cada persona verá las páginas marcadas en un orden sorteado. El orden queda en la columna «orden_paginas» del CSV."}
            </small>
          )}

          {page.questions.map((qu, qi) => (
            <fieldset key={qi} className="question stack">
              <div className="row between">
                <select value={qu.type} onChange={(e) => changeType(pi, qi, e.target.value as QType)} aria-label="Tipo de pregunta">
                  {Object.entries(TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <div className="row tight">
                  <button className="icon" title="Subir" onClick={() => setPage(pi, { questions: move(page.questions, qi, -1) })}>↑</button>
                  <button className="icon" title="Bajar" onClick={() => setPage(pi, { questions: move(page.questions, qi, 1) })}>↓</button>
                  <button className="icon danger" title="Borrar pregunta" onClick={() => setPage(pi, { questions: page.questions.filter((_, i) => i !== qi) })}>✕</button>
                </div>
              </div>
              <label>
                {qu.type === "info" ? "Texto" : "Pregunta"}
                <textarea rows={2} value={qu.label} onChange={(e) => setQ(pi, qi, { label: e.target.value })} />
              </label>
              {qu.type !== "info" && (
                <label>
                  Aclaración (opcional)
                  <input value={qu.help ?? ""} onChange={(e) => setQ(pi, qi, { help: e.target.value })} />
                </label>
              )}
              {(qu.type === "single" || qu.type === "multi") && (
                <>
                  <label>
                    Opciones, una por línea
                    <textarea
                      rows={Math.max(3, (qu.options?.length ?? 0) + 1)}
                      value={(qu.options ?? []).join("\n")}
                      onChange={(e) => setQ(pi, qi, { options: e.target.value.split("\n") })}
                    />
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={!!qu.other} onChange={(e) => setQ(pi, qi, { other: e.target.checked })} />
                    Añadir «Otro» con texto libre
                  </label>
                </>
              )}
              {qu.type === "matrix" && (
                <>
                  <label>
                    Escala (columnas), una por línea
                    <textarea
                      rows={Math.max(3, (qu.columns?.length ?? 0) + 1)}
                      value={(qu.columns ?? []).join("\n")}
                      onChange={(e) => setQ(pi, qi, { columns: e.target.value.split("\n") })}
                    />
                  </label>
                  <label>
                    Filas, una por línea
                    <textarea
                      rows={Math.max(3, (qu.rows?.length ?? 0) + 1)}
                      value={rowsToText(qu.rows)}
                      onChange={(e) => setQ(pi, qi, { rows: textToRows(e.target.value) })}
                    />
                    <small>Para fijar el nombre de la columna en el CSV escribe «codigo | texto de la fila».</small>
                  </label>
                </>
              )}
              {qu.type === "scale" && (
                <div className="row">
                  <label>
                    Puntos
                    <input type="number" min={2} max={11} value={qu.points ?? 5} onChange={(e) => setQ(pi, qi, { points: Number(e.target.value) })} />
                  </label>
                  <label>
                    Etiqueta del 1
                    <input value={qu.minLabel ?? ""} onChange={(e) => setQ(pi, qi, { minLabel: e.target.value })} />
                  </label>
                  <label>
                    Etiqueta del máximo
                    <input value={qu.maxLabel ?? ""} onChange={(e) => setQ(pi, qi, { maxLabel: e.target.value })} />
                  </label>
                </div>
              )}
              {qu.type === "number" && (
                <div className="row">
                  <label>
                    Mínimo
                    <input type="number" value={qu.min ?? ""} onChange={(e) => setQ(pi, qi, { min: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  </label>
                  <label>
                    Máximo
                    <input type="number" value={qu.max ?? ""} onChange={(e) => setQ(pi, qi, { max: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  </label>
                </div>
              )}
              {qu.type !== "info" && (
                <div className="row between">
                  <label className="check">
                    <input type="checkbox" checked={!!qu.required} onChange={(e) => setQ(pi, qi, { required: e.target.checked })} />
                    Obligatoria
                  </label>
                  <label className="code">
                    Código
                    <input value={qu.id} maxLength={40} onChange={(e) => setQ(pi, qi, { id: e.target.value })} />
                  </label>
                </div>
              )}
            </fieldset>
          ))}
          <button className="btn ghost" onClick={() => addQuestion(pi)}>
            + Añadir pregunta
          </button>
        </section>
      ))}

      <button className="btn ghost" onClick={() => change({ ...def, pages: [...def.pages, { title: `Página ${def.pages.length + 1}`, questions: [] }] })}>
        + Añadir página
      </button>

      <details className="card">
        <summary>Importar o exportar la encuesta como JSON</summary>
        <div className="stack">
          <p className="muted">Sirve para copiar una encuesta entre cuentas o versionarla junto a un estudio.</p>
          <textarea rows={12} className="mono" value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} placeholder="Pega aquí un JSON, o pulsa «Ver el JSON actual»." />
          <div className="row">
            <button className="btn ghost" onClick={() => setJson(JSON.stringify(def, null, 2))}>
              Ver el JSON actual
            </button>
            <button className="btn ghost" onClick={applyJson} disabled={!json.trim()}>
              Cargar este JSON en el editor
            </button>
          </div>
        </div>
      </details>

      <details className="card">
        <summary>Borrar la encuesta</summary>
        <div className="stack">
          <p className="muted">Se borran también todas sus respuestas. No se puede deshacer.</p>
          <button className="btn danger" onClick={() => confirm("¿Borrar la encuesta y todas sus respuestas?") && start(() => deleteSurvey(survey.id))}>
            Borrar definitivamente
          </button>
        </div>
      </details>

      <div className="savebar">
        <div className="grow">
          {status ? (
            <span className={status.kind === "error" ? "error" : "ok"} role="status">
              {status.text}
            </span>
          ) : published ? (
            <span className="muted">
              Publicada en <a href={`/e/${survey.slug}`}>{link}</a>
            </span>
          ) : (
            <span className="muted">{dirty ? "Hay cambios sin guardar." : "Borrador: solo tú puedes verla."}</span>
          )}
        </div>
        <button className="btn ghost" onClick={togglePublish} disabled={pending}>
          {published ? "Dejar de publicar" : "Publicar"}
        </button>
        <button className="btn" onClick={save} disabled={pending || !dirty}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
