import Link from "next/link";
import { headers } from "next/headers";
import { revokeToken } from "@/app/actions";
import { ConfirmButton } from "@/app/ConfirmButton";
import { Icon } from "@/app/Icon";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { NewToken } from "./Tokens";

export const metadata = { title: "Conectar por MCP" };

export default async function Page() {
  const user = await requireUser();
  const tokens = await q<{ id: string; name: string; created_at: string | Date }>("SELECT id, name, created_at FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/api/mcp`;
  const day = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });
  return (
    <div className="stack">
      <Link href="/panel" className="textlink">
        <Icon name="back" size={18} /> Mis encuestas
      </Link>
      <h1>Conectar por MCP</h1>
      <p className="lead">
        Con una clave, un asistente como Claude puede crear, editar y publicar tus encuestas y leer sus respuestas. No puede borrar encuestas ni respuestas.
      </p>
      <section className="panel stack">
        <h2>Dirección del servidor</h2>
        <code className="codeblock">{url}</code>
        <p className="muted">Transporte HTTP. La clave se envía en la cabecera «Authorization: Bearer …».</p>
      </section>
      <section className="panel stack">
        <h2>Claves</h2>
        <p className="muted">Una clave actúa como tú. Trátala como una contraseña y revócala si deja de hacer falta.</p>
        {tokens.length > 0 && (
          <ul className="records">
            {tokens.map((t) => (
              <li key={t.id}>
                <span className="grow">
                  {t.name} <span className="muted">creada el {day.format(new Date(t.created_at))}</span>
                </span>
                <ConfirmButton action={revokeToken.bind(null, t.id)} label={`Revocar la clave «${t.name}»`} message={`¿Revocar la clave «${t.name}»? Lo que esté conectado con ella dejará de funcionar.`}>
                  <Icon name="trash" size={18} />
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
        <NewToken url={url} />
      </section>
    </div>
  );
}
