import Link from "next/link";
import { deleteResponse } from "@/app/actions";
import { ConfirmButton } from "@/app/ConfirmButton";
import { Icon } from "@/app/Icon";
import { q } from "@/lib/db";
import { ORDER_KEY, hasShuffle, questions, type Answers, type Question } from "@/lib/survey";
import { loadSurvey } from "@/lib/own-survey";

export const metadata = { title: "Respuestas" };

const mean = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : "—");

function Bars({ counts, total }: { counts: [string, number][]; total: number }) {
  return (
    <ul className="bars">
      {counts.map(([label, n]) => (
        <li key={label}>
          <span>{label}</span>
          <span className="bar" style={{ "--w": `${total ? (100 * n) / total : 0}%` } as React.CSSProperties} />
          <span className="num">{n}</span>
        </li>
      ))}
    </ul>
  );
}

function Summary({ qu, all }: { qu: Question; all: Answers[] }) {
  const values = all.map((a) => a[qu.id]).filter((v) => v !== undefined);
  const n = <p className="muted">{values.length} respuestas</p>;
  if (qu.type === "single" || qu.type === "multi" || qu.type === "select") {
    const flat = values.flatMap((v) => (Array.isArray(v) ? v : [v as string]));
    const labels = [...(qu.options ?? []), ...(qu.other ? ["Otro"] : [])];
    const counts = labels.map((l): [string, number] => [l, flat.filter((v) => (l === "Otro" ? !qu.options!.includes(v) : v === l)).length]);
    return <>{n}<Bars counts={counts} total={values.length} /></>;
  }
  if (qu.type === "scale") {
    const nums = values as number[];
    const counts = Array.from({ length: qu.points! }, (_, i): [string, number] => [String(i + 1), nums.filter((v) => v === i + 1).length]);
    return <><p className="muted">{nums.length} respuestas · media {mean(nums)}</p><Bars counts={counts} total={nums.length} /></>;
  }
  if (qu.type === "matrix") {
    const maps = values as Record<string, number>[];
    return (
      <table className="matrix-summary">
        <thead>
          <tr><th>Fila</th><th>n</th><th>Media (1–{qu.columns!.length})</th></tr>
        </thead>
        <tbody>
          {qu.rows!.map((r) => {
            const nums = maps.map((m) => m[r.id]).filter((v) => v !== undefined);
            return <tr key={r.id}><td>{r.label}</td><td>{nums.length}</td><td>{mean(nums)}</td></tr>;
          })}
        </tbody>
      </table>
    );
  }
  if (qu.type === "number") return <p className="muted">{values.length} respuestas · media {mean(values as number[])}</p>;
  return (
    <>
      {n}
      <ul className="texts">
        {(values as string[]).slice(0, 50).map((v, i) => <li key={i}>{v}</li>)}
      </ul>
      {values.length > 50 && <p className="muted">Se muestran 50. El CSV las trae todas.</p>}
    </>
  );
}

export default async function Page({ params }: PageProps<"/panel/[id]/respuestas">) {
  const survey = await loadSurvey((await params).id);
  const rows = await q<{ id: string; created_at: string | Date; answers: Answers }>(
    "SELECT id, created_at, answers FROM responses WHERE survey_id = $1 ORDER BY created_at DESC",
    [survey.id],
  );
  const when = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
  const all = rows.map((r) => r.answers);
  return (
    <div className="stack">
      <Link href={`/panel/${survey.id}`} className="textlink">
        <Icon name="back" size={18} /> Editar encuesta
      </Link>
      <div className="row between">
        <h1>{survey.title}</h1>
        <a className="btn" href={`/panel/${survey.id}/csv`}>Descargar CSV</a>
      </div>
      <p className="lead"><strong>{all.length}</strong> {all.length === 1 ? "respuesta recibida" : "respuestas recibidas"}</p>
      {all.length > 0 && hasShuffle(survey.definition) && (
        <section className="card">
          <h2 className="qtitle">Orden en que se mostraron las páginas</h2>
          <Bars
            counts={[...new Set(all.map((a) => String(a[ORDER_KEY] ?? "sin registro")))]
              .sort()
              .map((o): [string, number] => [o, all.filter((a) => String(a[ORDER_KEY] ?? "sin registro") === o).length])}
            total={all.length}
          />
        </section>
      )}
      {rows.length > 0 && (
        <details className="panel">
          <summary>Respuestas una por una ({rows.length})</summary>
          <div className="stack">
            <p className="muted">Borra aquí las pruebas o los envíos que no deban contar. El código es el mismo de la columna «id» del CSV. Hora de Colombia.</p>
            <ul className="records">
              {rows.map((r) => (
                <li key={r.id}>
                  <span className="grow">
                    {when.format(new Date(r.created_at))} <span className="muted mono">{r.id.slice(0, 8)}</span>
                  </span>
                  <ConfirmButton
                    action={deleteResponse.bind(null, survey.id, r.id)}
                    label={`Borrar la respuesta ${r.id.slice(0, 8)}`}
                    message={`¿Borrar la respuesta del ${when.format(new Date(r.created_at))}? No se puede deshacer.`}
                  >
                    <Icon name="trash" size={18} />
                  </ConfirmButton>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      {all.length > 0 &&
        questions(survey.definition)
          .filter((qu) => qu.type !== "info")
          .map((qu) => (
            <section key={qu.id} className="card">
              <h2 className="qtitle">{qu.label}</h2>
              <Summary qu={qu} all={all} />
            </section>
          ))}
    </div>
  );
}
