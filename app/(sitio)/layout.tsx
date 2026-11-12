import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { logout } from "@/app/actions";
import { Icon } from "@/app/Icon";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  return (
    <>
      <a href="#contenido" className="skip">
        Saltar al contenido
      </a>
      <header className="top">
        <Link href="/" className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <ellipse cx="6" cy="16" rx="3.6" ry="7" fill="none" stroke="#c2185b" strokeWidth="2.4" />
            <ellipse cx="16" cy="16" rx="4.8" ry="8.2" fill="#1b1a21" />
            <ellipse cx="26" cy="16" rx="3.6" ry="7" fill="none" stroke="#c2185b" strokeWidth="2.4" />
          </svg>
          Encuestas
        </Link>
        <nav>
          {user ? (
            <>
              <Link href="/panel">Mis encuestas</Link>
              <form action={logout}>
                <button className="link">Salir</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/ingresar">Ingresar</Link>
              <Link href="/registro" className="btn small">
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </header>
      <main id="contenido">{children}</main>
      <footer className="foot">
        <span>Software libre con licencia MIT.</span>
        <a href="https://github.com/JuanGaitanD/encuestas">
          Código en GitHub <Icon name="external" size={16} />
        </a>
        <Link href="/privacidad">Privacidad</Link>
      </footer>
    </>
  );
}
