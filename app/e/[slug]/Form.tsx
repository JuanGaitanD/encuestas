"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitResponse } from "@/app/actions";
import { Field } from "@/app/Fields";
import { Icon } from "@/app/Icon";
import { checkAnswer, randomOrder, validOrder, type Answer, type Answers, type Definition } from "@/lib/survey";

type Props = { slug: string; title: string; def: Definition; preview: boolean };
type Saved = { step: number; answers: Answers; order?: number[]; done?: boolean };

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
    setErrors({});
    top.current?.scrollIntoView({ block: "start" });
  };
  const setAnswer = (id: string, v: Answer | undefined) => {
    setAnswers((a) => {
      const copy = { ...a };
      if (v === undefined) delete copy[id];
      else copy[id] = v;
      return copy;
    });
    if (errors[id]) setErrors(({ [id]: _, ...rest }) => rest);
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
  const missing = Object.keys(errors).length;

  return (
    <div className="survey" ref={top}>
      {preview && <p className="banner">Vista previa del borrador. Las respuestas no se guardan.</p>}

      {step === -1 && (
        <section className="stack intro">
          <h1>{title}</h1>
          <p className="pre">{def.intro}</p>
          {def.consent && (
            <label className="option consent">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span className="mark checkbox" aria-hidden="true" />
              <span className="otext">{def.consent}</span>
            </label>
          )}
          <div className="actions">
            <button className="btn" disabled={!!def.consent && !accepted} onClick={() => go(0)}>
              Empezar <Icon name="arrow" />
            </button>
            {!!def.consent && !accepted && <small>Marca la casilla para empezar.</small>}
          </div>
        </section>
      )}

      {shown && (
        <section className="stack" key={step}>
          <div className="stepbar">
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={last} aria-valuenow={step + 1} aria-label={`Parte ${step + 1} de ${last}`}>
              <span style={{ width: `${(100 * (step + 1)) / last}%` }} />
            </div>
            <span className="stepcount">
              {step + 1} de {last}
            </span>
          </div>
          <header className="pagehead">
            <h1>{shown.title}</h1>
            {shown.description && <p className="pre">{shown.description}</p>}
          </header>

          {shown.questions.map((qu) =>
            qu.type === "info" ? (
              <p key={qu.id} className="pre info">
                {qu.label}
              </p>
            ) : (
              <div key={qu.id} id={`q-${qu.id}`} className={errors[qu.id] ? "q bad" : "q"}>
                <div className="qhead">
                  <p className="qlabel">
                    {qu.label}
                    {!qu.required && <span className="optional"> (opcional)</span>}
                  </p>
                  {qu.help && (
                    <p className="qhelp" id={`h-${qu.id}`}>
                      {qu.help}
                    </p>
                  )}
                </div>
                <Field
                  qu={qu}
                  value={answers[qu.id]}
                  set={(v) => setAnswer(qu.id, v)}
                  invalid={!!errors[qu.id]}
                  describedBy={[qu.help && `h-${qu.id}`, errors[qu.id] && `e-${qu.id}`].filter(Boolean).join(" ") || undefined}
                />
                {errors[qu.id] && (
                  <p className="error" role="alert" id={`e-${qu.id}`}>
                    {errors[qu.id]}
                  </p>
                )}
              </div>
            ),
          )}

          {/* Campo trampa: las personas no lo ven; los bots suelen rellenarlo. */}
          <input ref={trap} className="trap" tabIndex={-1} autoComplete="off" name="website" aria-hidden />
          {(failure || missing > 0) && (
            <p className="error summary" role="alert">
              {failure || (missing === 1 ? "Falta una pregunta por responder en esta parte." : `Faltan ${missing} preguntas por responder en esta parte.`)}
            </p>
          )}
          <div className="navrow">
            <button className="btn ghost" onClick={() => go(step - 1)} disabled={pending}>
              <Icon name="back" /> Atrás
            </button>
            <button className="btn" onClick={next} disabled={pending} aria-busy={pending}>
              {pending ? "Enviando…" : step === last - 1 ? "Enviar respuestas" : "Siguiente"}
              {!pending && <Icon name={step === last - 1 ? "check" : "arrow"} />}
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
