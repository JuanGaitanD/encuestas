import Link from "next/link";
import { q } from "@/lib/db";
import { questions, type Answers, type Question } from "@/lib/survey";
import { loadOwnSurvey } from "@/lib/own-survey";

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
  if (qu.type === "single" || qu.type === "multi") {
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
  const survey = await loadOwnSurvey((await params).id);
  const rows = await q<{ answers: Answers }>("SELECT answers FROM responses WHERE survey_id = $1", [survey.id]);
  const all = rows.map((r) => r.answers);
  return (
    <div className="stack">
      <Link href={`/panel/${survey.id}`}>← Editar encuesta</Link>
      <div className="row between">
        <h1>{survey.title}</h1>
        <a className="btn" href={`/panel/${survey.id}/csv`}>Descargar CSV</a>
      </div>
      <p className="lead"><strong>{all.length}</strong> {all.length === 1 ? "respuesta recibida" : "respuestas recibidas"}</p>
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
