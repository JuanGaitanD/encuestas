import Link from "next/link";
import { Icon } from "@/app/Icon";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { googleConfig } from "@/lib/google";
import { GOOGLE_MESSAGES, GoogleButton } from "../../Google";
import { PasswordForm } from "./Password";

export const metadata = { title: "Cuenta" };

export default async function Page({ searchParams }: PageProps<"/panel/cuenta">) {
  const user = await requireUser();
  const [row] = await q<{ pass: string; google: string | null }>(
    "SELECT u.pass, g.email AS google FROM users u LEFT JOIN google_accounts g ON g.user_id = u.id WHERE u.id = $1",
    [user.id],
  );
  const code = String((await searchParams).google ?? "");
  const notice = GOOGLE_MESSAGES[code];
  return (
    <div className="stack">
      <Link href="/panel" className="textlink">
        <Icon name="back" size={18} /> Mis encuestas
      </Link>
      <h1>Cuenta</h1>
      <p className="lead">
        {user.name} · <span className="mono">{user.email}</span>
      </p>
      {notice && (
        <p className={code === "conectado" ? "ok" : "error"} role={code === "conectado" ? "status" : "alert"}>
          {notice}
        </p>
      )}
      <section className="panel stack">
        <h2>Google</h2>
        {row?.google ? (
          <p>
            Conectado con <span className="mono">{row.google}</span>. Puedes entrar con Google{row.pass ? " o con tu contraseña" : ""}.
          </p>
        ) : googleConfig() ? (
          <>
            <p className="muted">Conecta el Google de este mismo correo para entrar también con él. Tus encuestas siguen en esta cuenta.</p>
            <div className="row">
              <GoogleButton connect />
            </div>
          </>
        ) : (
          <p className="muted">El ingreso con Google no está activo en esta instalación.</p>
        )}
      </section>
      <section className="panel stack">
        <h2>Contraseña</h2>
        {!row?.pass && <p className="muted">Entraste con Google y esta cuenta no tiene contraseña. Si creas una, podrás entrar también con tu correo.</p>}
        <PasswordForm hasPassword={!!row?.pass} />
      </section>
    </div>
  );
}
