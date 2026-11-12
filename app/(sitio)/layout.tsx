import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { logout } from "@/app/actions";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  return (
    <>
      <a href="#contenido" className="skip">
        Saltar al contenido
      </a>
      <header className="top">
        <Link href="/" className="brand">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#1f5c46" />
            <rect x="7" y="8" width="18" height="3.6" rx="1.8" fill="#f6f3ec" />
            <rect x="7" y="14.2" width="12" height="3.6" rx="1.8" fill="#f6f3ec" opacity="0.75" />
            <path d="M8 23.2l3 3 6-6.4" fill="none" stroke="#f2b84b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
        <a href="https://github.com/JuanGaitanD/encuestas">Código en GitHub</a>
        <Link href="/privacidad">Privacidad</Link>
      </footer>
    </>
  );
}
