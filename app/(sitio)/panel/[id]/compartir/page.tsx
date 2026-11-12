import Link from "next/link";
import { headers } from "next/headers";
import { Icon } from "@/app/Icon";
import { loadSurvey } from "@/lib/own-survey";
import { CopyQr, ShareButtons } from "./ShareButtons";

export const metadata = { title: "Compartir encuesta" };

export default async function Page({ params }: PageProps<"/panel/[id]/compartir">) {
  const survey = await loadSurvey((await params).id);
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/e/${survey.slug}`;
  const qr = `/panel/${survey.id}/qr`;
  return (
    <div className="stack">
      <Link href={`/panel/${survey.id}`} className="textlink">
        <Icon name="back" size={18} /> Volver a la encuesta
      </Link>
      <h1>Compartir «{survey.title}»</h1>
      {!survey.published && (
        <p className="error" role="status">
          La encuesta está en borrador. El enlace y el código ya son los definitivos, pero no reciben respuestas hasta que la publiques.
        </p>
      )}
      <section className="panel stack">
        <h2>Enlace</h2>
        <code className="codeblock">{url}</code>
        <ShareButtons url={url} title={survey.title} />
      </section>
      <section className="panel stack">
        <h2>Código QR</h2>
        <p className="muted">Quien lo escanee con la cámara del celular llega directo a la encuesta. Sirve para proyectarlo en clase o imprimirlo.</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada al vuelo; no pasa por el optimizador */}
        <img className="qr" src={qr} width={260} height={260} alt={`Código QR que lleva a ${url}`} />
        <div className="row">
          <CopyQr src={qr} />
          <a className="btn ghost" href={qr} download={`${survey.slug}-qr.png`}>
            <Icon name="download" size={18} /> Descargar el QR
          </a>
        </div>
      </section>
    </div>
  );
}
