"use client";

// Demostraciones de la portada. Usan los mismos controles que el formulario público (`Field`),
// así que lo que se prueba aquí es lo que verá quien responde. No guardan ni envían nada.
import { useState } from "react";
import { Field } from "@/app/Fields";
import { Icon, type IconName } from "@/app/Icon";
import { TYPES, type Answer, type QType, type Question } from "@/lib/survey";
import { Celular } from "./Celular";

const MUESTRAS: Record<QType, Question> = {
  short: { id: "demo_short", type: "short", label: "¿En qué ciudad estudias?" },
  long: { id: "demo_long", type: "long", label: "¿Qué te ayudaría a estudiar mejor?" },
  number: { id: "demo_number", type: "number", label: "¿Cuántas horas estudias en una semana?", min: 0, max: 60 },
  single: { id: "demo_single", type: "single", label: "¿Cómo prefieres preparar un parcial?", options: ["A solas", "En grupo", "Con una monitoría"] },
  select: { id: "demo_select", type: "select", label: "¿Qué carrera estudias?", options: ["Ingeniería de Software", "Diseño", "Psicología", "Economía"] },
  multi: { id: "demo_multi", type: "multi", label: "¿Dónde estudias normalmente?", other: true, options: ["En casa", "En la biblioteca", "En una cafetería"] },
  scale: { id: "demo_scale", type: "scale", label: "¿Qué tan pesada sientes la carga del semestre?", points: 5, minLabel: "Muy ligera", maxLabel: "Muy pesada" },
  matrix: {
    id: "demo_matrix",
    type: "matrix",
    label: "¿Qué tan de acuerdo estás con cada frase?",
    columns: ["En desacuerdo", "Neutral", "De acuerdo"],
    rows: [
      { id: "plan", label: "Planeo mi semana de estudio." },
      { id: "ayuda", label: "Sé a quién pedir ayuda." },
    ],
  },
  info: { id: "demo_info", type: "info", label: "Las siguientes preguntas son sobre tu semana de estudio. No hay respuestas correctas." },
};

/** Los nueve tipos de pregunta: se elige uno y se prueba su control. */
export function DemoTipos() {
  const [type, setType] = useState<QType>("multi");
  const [value, setValue] = useState<Answer | undefined>(["En la biblioteca"]);
  const qu = MUESTRAS[type];
  return (
    <div className="demo-tipos">
      <div className="tipos-lista" role="group" aria-label="Tipos de pregunta">
        {(Object.keys(TYPES) as QType[]).map((t) => (
          <button key={t} type="button" className="tipo" aria-pressed={t === type} onClick={() => (setType(t), setValue(undefined))}>
            <Icon name={t as IconName} size={18} /> {TYPES[t]}
          </button>
        ))}
      </div>
      <div className="demo-vista" key={type}>
        <p className="previewtag">
          <Icon name="eye" size={16} /> Así la verá quien responde
        </p>
        {type === "info" ? (
          <p className="info">{qu.label}</p>
        ) : (
          <div className="q">
            <p className="qlabel">{qu.label}</p>
            <Field qu={qu} value={value} set={setValue} />
          </div>
        )}
      </div>
    </div>
  );
}

/** La presentación con su casilla de consentimiento, dentro de un celular: hay que marcarla para empezar. */
export function DemoConsentimiento() {
  const [accepted, setAccepted] = useState(false);
  const [started, setStarted] = useState(false);
  const [value, setValue] = useState<Answer | undefined>();
  return (
    <Celular>
      {started ? (
        <div className="demo-movil" key="pregunta">
          <div className="stepbar">
            <div className="progress" aria-hidden="true">
              <span style={{ width: "50%" }} />
            </div>
            <span className="stepcount">1 de 2</span>
          </div>
          <div className="q">
            <p className="qlabel">{MUESTRAS.single.label}</p>
            <Field qu={{ ...MUESTRAS.single, id: "demo_inicio" }} value={value} set={setValue} />
          </div>
          <button type="button" className="btn text" onClick={() => (setStarted(false), setAccepted(false), setValue(undefined))}>
            <Icon name="back" size={18} /> Volver a la presentación
          </button>
        </div>
      ) : (
        <div className="demo-movil" key="presentacion">
          <p className="demo-titulo">Hábitos de estudio en primer semestre</p>
          <p>Queremos saber cómo estudian quienes empiezan la carrera. Tus respuestas son anónimas: no pedimos nombre ni correo.</p>
          <label className="option consent">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span className="mark checkbox" aria-hidden="true" />
            <span className="otext">He leído la información y acepto participar.</span>
          </label>
          <button type="button" className="btn" disabled={!accepted} onClick={() => setStarted(true)}>
            Empezar <Icon name="arrow" />
          </button>
          {!accepted && <small>Marca la casilla para empezar.</small>}
        </div>
      )}
    </Celular>
  );
}
