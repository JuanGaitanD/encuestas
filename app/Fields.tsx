"use client";

// El control de cada tipo de pregunta. Lo usan el formulario público y la vista previa del editor,
// así que lo que se ve al crear una pregunta es exactamente lo que verá quien responde.
import { OTHER, type Answer, type Question } from "@/lib/survey";

type Props = { qu: Question; value: Answer | undefined; set: (v: Answer | undefined) => void; describedBy?: string; invalid?: boolean };

function Choice({ qu, value, set }: Props) {
  const multi = qu.type === "multi";
  const options = qu.options ?? [];
  const picked = multi ? ((value as string[]) ?? []) : value === undefined ? [] : [value as string];
  const otherValue = picked.find((v) => !options.includes(v));
  const toggle = (opt: string, on: boolean) => {
    if (!multi) return set(on ? opt : undefined);
    const next = on ? [...picked, opt] : picked.filter((v) => v !== opt);
    set(next.length ? next : undefined);
  };
  const setOther = (text: string | null) => {
    const rest = picked.filter((v) => options.includes(v));
    const mine = text === null ? [] : [OTHER + text];
    if (multi) set([...rest, ...mine].length ? [...rest, ...mine] : undefined);
    else set(mine[0]);
  };
  const kind = multi ? "checkbox" : "radio";
  return (
    <div className="options" role={multi ? "group" : "radiogroup"} aria-label={qu.label}>
      {options.map((opt) => (
        <label key={opt} className="option">
          <input type={kind} name={qu.id} checked={picked.includes(opt)} onChange={(e) => toggle(opt, e.target.checked)} />
          <span className={`mark ${kind}`} aria-hidden="true" />
          <span className="otext">{opt}</span>
        </label>
      ))}
      {qu.other && (
        <label className="option">
          <input type={kind} name={qu.id} checked={otherValue !== undefined} onChange={(e) => setOther(e.target.checked ? "" : null)} />
          <span className={`mark ${kind}`} aria-hidden="true" />
          <span className="otext">Otro</span>
          {otherValue !== undefined && (
            <input
              className="other"
              autoFocus
              maxLength={280}
              placeholder="¿Cuál?"
              value={otherValue.slice(OTHER.length)}
              onChange={(e) => setOther(e.target.value)}
              aria-label="Especifica cuál"
            />
          )}
        </label>
      )}
    </div>
  );
}

export function Field(props: Props) {
  const { qu, value, set, describedBy, invalid } = props;
  const aria = { "aria-label": qu.label, "aria-describedby": describedBy, "aria-invalid": invalid || undefined };
  switch (qu.type) {
    case "short":
      return <input maxLength={500} placeholder="Escribe tu respuesta" value={(value as string) ?? ""} onChange={(e) => set(e.target.value || undefined)} {...aria} />;
    case "long": {
      const text = (value as string) ?? "";
      return (
        <div className="longfield">
          <textarea rows={4} maxLength={5000} placeholder="Escribe tu respuesta" value={text} onChange={(e) => set(e.target.value || undefined)} {...aria} />
          {text.length > 4000 && <small className="counter">{text.length} de 5000</small>}
        </div>
      );
    }
    case "number": {
      const range =
        qu.min !== undefined && qu.max !== undefined ? `Entre ${qu.min} y ${qu.max}` : qu.min !== undefined ? `Desde ${qu.min}` : qu.max !== undefined ? `Hasta ${qu.max}` : "";
      return (
        <div className="numberfield">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Un número"
            min={qu.min}
            max={qu.max}
            value={(value as number) ?? ""}
            onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
            {...aria}
          />
          {range && <small>{range}</small>}
        </div>
      );
    }
    case "select":
      return (
        <select className="pick" value={(value as string) ?? ""} onChange={(e) => set(e.target.value || undefined)} {...aria}>
          <option value="">Elige una opción</option>
          {(qu.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "single":
    case "multi":
      return <Choice {...props} />;
    case "scale": {
      const points = qu.points ?? 5;
      return (
        <div className="scale">
          <div className="segments" role="radiogroup" aria-label={qu.label} style={{ "--cols": points } as React.CSSProperties}>
            {Array.from({ length: points }, (_, i) => i + 1).map((n) => (
              <label key={n} className="segment">
                <input type="radio" name={qu.id} checked={value === n} onChange={() => set(n)} aria-label={String(n)} />
                <span>{n}</span>
              </label>
            ))}
          </div>
          {(qu.minLabel || qu.maxLabel) && (
            <div className="ends" aria-hidden="true">
              <span>{qu.minLabel}</span>
              <span>{qu.maxLabel}</span>
            </div>
          )}
        </div>
      );
    }
    case "matrix": {
      const m = (value as Record<string, number>) ?? {};
      const columns = qu.columns ?? [];
      return (
        <div className="matrix" style={{ "--cols": columns.length } as React.CSSProperties}>
          <div className="mrow mhead" aria-hidden="true">
            <span />
            {columns.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          {(qu.rows ?? []).map((r) => (
            <div key={r.id} className={m[r.id] ? "mrow answered" : "mrow"} role="radiogroup" aria-label={r.label}>
              <span className="mlabel">{r.label}</span>
              {columns.map((c, i) => (
                <label key={c} className="cell">
                  <input type="radio" name={`${qu.id}.${r.id}`} checked={m[r.id] === i + 1} onChange={() => set({ ...m, [r.id]: i + 1 })} aria-label={c} />
                  <span className="mark radio" aria-hidden="true" />
                  <span className="ctext" aria-hidden="true">{c}</span>
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
