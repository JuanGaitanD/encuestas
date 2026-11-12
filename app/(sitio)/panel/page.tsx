import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listSurveys } from "@/lib/surveys";
import { createSurvey, deleteSurvey } from "@/app/actions";
import { ConfirmButton } from "@/app/ConfirmButton";
import { Icon } from "@/app/Icon";

export const metadata = { title: "Mis encuestas" };

export default async function Panel({ searchParams }: PageProps<"/panel">) {
  const limite = (await searchParams).limite;
  const user = await requireUser();
  const surveys = await listSurveys(user.id);
  return (
    <>
      <div className="row between">
        <h1>Mis encuestas</h1>
        <div className="row">
          <Link href="/panel/conexion" className="btn ghost">
            Conectar por MCP
          </Link>
          <form action={createSurvey}>
            <button className="btn">Nueva encuesta</button>
          </form>
        </div>
      </div>
      {limite && (
        <p className="error" role="alert">
          Llegaste al máximo de 20 encuestas por cuenta. Borra alguna para crear otra.
        </p>
      )}
      {surveys.length === 0 ? (
        <p className="empty">Todavía no tienes encuestas. Crea la primera con el botón de arriba.</p>
      ) : (
        <ul className="list">
          {surveys.map((s) => (
            <li key={s.id} className="card row between">
              <div className="grow">
                <Link href={`/panel/${s.id}`} className="title">
                  {s.title}
                </Link>
                <p className="muted">
                  <span className={s.published ? "tag on" : "tag"}>{s.published ? "Publicada" : "Borrador"}</span>
                  {!s.owner && <span className="tag">Compartida contigo</span>} /e/{s.slug}
                </p>
              </div>
              <Link href={`/panel/${s.id}/respuestas`} className="count">
                <strong>{s.n}</strong> {s.n === 1 ? "respuesta" : "respuestas"}
              </Link>
              {s.owner && (
              <ConfirmButton
                action={deleteSurvey.bind(null, s.id)}
                label={`Borrar la encuesta «${s.title}»`}
                message={`¿Borrar la encuesta «${s.title}» y sus ${s.n} respuestas? No se puede deshacer.`}
              >
                <Icon name="trash" size={18} />
              </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
