"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitResponse } from "@/app/actions";
import { OTHER, checkAnswer, randomOrder, validOrder, type Answer, type Answers, type Definition, type Question } from "@/lib/survey";

type Props = { slug: string; title: string; def: Definition; preview: boolean };
type Saved = { step: number; answers: Answers; order?: number[]; done?: boolean };

function Choice({ qu, value, set }: { qu: Question; value: Answer | undefined; set: (v: Answer | undefined) => void }) {
  const multi = qu.type === "multi";
  const picked = multi ? ((value as string[]) ?? []) : value === undefined ? [] : [value as string];
  const otherValue = picked.find((v) => !qu.options!.includes(v));
  const toggle = (opt: string, on: boolean) => {
    if (!multi) return set(on ? opt : undefined);
    const next = on ? [...picked, opt] : picked.filter((v) => v !== opt);
    set(next.length ? next : undefined);
  };
  const setOther = (text: string | null) => {
    const rest = picked.filter((v) => qu.options!.includes(v));
    const mine = text === null ? [] : [OTHER + text];
    if (multi) set([...rest, ...mine].length ? [...rest, ...mine] : undefined);
    else set(mine[0]);
  };
  return (
    <div className="options">
      {qu.options!.map((opt) => (
        <label key={opt} className="option">
          <input type={multi ? "checkbox" : "radio"} name={qu.id} checked={picked.includes(opt)} onChange={(e) => toggle(opt, e.target.checked)} />
          <span>{opt}</span>
        </label>
      ))}
      {qu.other && (
        <label className="option">
          <input type={multi ? "checkbox" : "radio"} name={qu.id} checked={otherValue !== undefined} onChange={(e) => setOther(e.target.checked ? "" : null)} />
          <span>Otro</span>
          {otherValue !== undefined && (
            <input className="other" autoFocus maxLength={280} value={otherValue.slice(OTHER.length)} onChange={(e) => setOther(e.target.value)} aria-label="Especifica" />
          )}
        </label>
      )}
    </div>
  );
}

function Field({ qu, value, set }: { qu: Question; value: Answer | undefined; set: (v: Answer | undefined) => void }) {
  switch (qu.type) {
    case "short":
      return <input maxLength={500} value={(value as string) ?? ""} onChange={(e) => set(e.target.value || undefined)} aria-label={qu.label} />;
    case "long":
      return <textarea rows={4} maxLength={5000} value={(value as string) ?? ""} onChange={(e) => set(e.target.value || undefined)} aria-label={qu.label} />;
    case "number":
      return (
        <input
          type="number"
          inputMode="numeric"
          className="short"
          min={qu.min}
          max={qu.max}
          value={(value as number) ?? ""}
          onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
          aria-label={qu.label}
        />
      );
    case "single":
    case "multi":
      return <Choice qu={qu} value={value} set={set} />;
    case "scale":
      return (
        <div className="scale" role="radiogroup" aria-label={qu.label}>
          {qu.minLabel && <span className="end">{qu.minLabel}</span>}
          {Array.from({ length: qu.points! }, (_, i) => i + 1).map((n) => (
            <label key={n} className="dot">
              <input type="radio" name={qu.id} checked={value === n} onChange={() => set(n)} />
              <span>{n}</span>
            </label>
          ))}
          {qu.maxLabel && <span className="end">{qu.maxLabel}</span>}
        </div>
      );
    case "matrix": {
      const m = (value as Record<string, number>) ?? {};
      return (
        <div className="matrix">
          <div className="mrow mhead" aria-hidden>
            <span />
            {qu.columns!.map((c) => <span key={c}>{c}</span>)}
          </div>
          {qu.rows!.map((r) => (
            <div key={r.id} className="mrow" role="radiogroup" aria-label={r.label} style={{ "--cols": qu.columns!.length } as React.CSSProperties}>
              <span className="mlabel">{r.label}</span>
              {qu.columns!.map((c, i) => (
                <label key={c} className={m[r.id] === i + 1 ? "cell on" : "cell"}>
                  <input type="radio" name={`${qu.id}.${r.id}`} checked={m[r.id] === i + 1} onChange={() => set({ ...m, [r.id]: i + 1 })} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

export function Form({ slug, title, def, preview }: Props) {
  const key = `encuesta:${slug}`;
  // step: -1 presentación, 0..n-1 páginas, n agradecimiento
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Answers>({});
  const [order, setOrder] = useState<number[]>(() => def.pages.map((_, i) => i));
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pending, start] = useTransition();
  const trap = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const last = def.pages.length;

  // El avance vive en sessionStorage: sobrevive a recargar, pero no queda para la siguiente persona
  // que use el equipo. En localStorage solo queda la marca de «ya respondí».
  useEffect(() => {
    let saved: Saved | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(key) ?? sessionStorage.getItem(key) ?? "null") as Saved | null;
    } catch {}
    // El orden se sortea una vez por persona y se conserva si recarga.
    setOrder(saved && validOrder(def, saved.order) ? saved.order : randomOrder(def));
    try {
      if (saved?.done) setStep(last);
      else if (saved) {
        setAnswers(saved.answers ?? {});
        setStep(Math.min(saved.step ?? -1, last - 1));
        if ((saved.step ?? -1) >= 0) setAccepted(true);
      }
    } catch {}
    setLoaded(true);
  }, [key, last, def]);
  useEffect(() => {
    if (loaded && step < last) sessionStorage.setItem(key, JSON.stringify({ step, answers, order } satisfies Saved));
  }, [loaded, key, step, answers, order, last]);

  const go = (to: number) => {
    setStep(to);
    setFailure("");
    top.current?.scrollIntoView({ block: "start" });
  };
  const next = () => {
    const page = def.pages[order[step]];
    const found: Record<string, string> = {};
    for (const qu of page.questions) {
      const e = checkAnswer(qu, answers[qu.id]);
      if (e) found[qu.id] = e;
    }
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return document.getElementById(`q-${first}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (step < last - 1) return go(step + 1);
    if (preview) return go(last);
    start(async () => {
      const r = await submitResponse(slug, answers, trap.current?.value ?? "", order);
      if (!r.ok) return setFailure(r.error);
      sessionStorage.removeItem(key);
      localStorage.setItem(key, JSON.stringify({ step: last, answers: {}, done: true } satisfies Saved));
      go(last);
    });
  };

  if (!loaded) return <div className="survey" />;
  const shown = step >= 0 && step < last ? def.pages[order[step]] : null;

  return (
    <div className="survey" ref={top}>
      {preview && <p className="banner">Vista previa del borrador. Las respuestas no se guardan.</p>}
      {step === -1 && (
        <section className="stack">
          <h1>{title}</h1>
          <p className="pre">{def.intro}</p>
          {def.consent && (
            <label className="check consent">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>{def.consent}</span>
            </label>
          )}
          <div>
            <button className="btn" disabled={!!def.consent && !accepted} onClick={() => go(0)}>
              Empezar
            </button>
          </div>
        </section>
      )}

      {step >= 0 && step < last && (
        <section className="stack" key={step}>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={last} aria-valuenow={step + 1} aria-label="Avance">
            <span style={{ width: `${(100 * (step + 1)) / last}%` }} />
          </div>
          <p className="muted">
            Parte {step + 1} de {last}
          </p>
          <h1>{shown!.title}</h1>
          {shown!.description && <p className="pre">{shown!.description}</p>}
          {shown!.questions.map((qu) =>
            qu.type === "info" ? (
              <p key={qu.id} className="pre info">
                {qu.label}
              </p>
            ) : (
              <div key={qu.id} id={`q-${qu.id}`} className={errors[qu.id] ? "q bad" : "q"}>
                <p className="qlabel">
                  {qu.label}
                  {qu.required && <span className="req" title="Obligatoria"> *</span>}
                </p>
                {qu.help && <p className="muted">{qu.help}</p>}
                <Field
                  qu={qu}
                  value={answers[qu.id]}
                  set={(v) => {
                    setAnswers((a) => {
                      const copy = { ...a };
                      if (v === undefined) delete copy[qu.id];
                      else copy[qu.id] = v;
                      return copy;
                    });
                    if (errors[qu.id]) setErrors(({ [qu.id]: _, ...rest }) => rest);
                  }}
                />
                {errors[qu.id] && (
                  <p className="error" role="alert">
                    {errors[qu.id]}
                  </p>
                )}
              </div>
            ),
          )}
          {/* Campo trampa: las personas no lo ven; los bots suelen rellenarlo. */}
          <input ref={trap} className="trap" tabIndex={-1} autoComplete="off" name="website" aria-hidden />
          {failure && (
            <p className="error" role="alert">
              {failure}
            </p>
          )}
          <div className="row between">
            <button className="btn ghost" onClick={() => go(step - 1)} disabled={pending}>
              Atrás
            </button>
            <button className="btn" onClick={next} disabled={pending}>
              {pending ? "Enviando…" : step === last - 1 ? "Enviar respuestas" : "Siguiente"}
            </button>
          </div>
        </section>
      )}

      {step === last && (
        <section className="stack done">
          <svg className="done-mark" viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="28" r="28" />
            <path d="M17 29l8 8 15-17" />
          </svg>
          <h1>Listo</h1>
          <p className="pre">{def.thanks || "Gracias por responder."}</p>
          {!preview && (
            <p className="muted">
              ¿Eres otra persona usando este mismo equipo?{" "}
              <button
                className="link"
                onClick={() => {
                  localStorage.removeItem(key);
                  setAnswers({});
                  setAccepted(false);
                  setOrder(randomOrder(def));
                  go(-1);
                }}
              >
                Responder la encuesta
              </button>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
