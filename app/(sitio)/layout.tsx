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
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <clipPath id="burbuja">
              <circle cx="16" cy="16" r="10.6" />
            </clipPath>
            <path className="lapiz" pathLength={1} clipPath="url(#burbuja)" d="M6 13l6-8L5 21 20 4 7 27 27 7 13 29l15-15-9 15 9-8" fill="none" stroke="#201a1f" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="16" r="12" fill="none" stroke="#c2185b" strokeWidth="2.6" />
          </svg>
          Encuestas
        </Link>
        <nav>
          {user ? (
            <>
              <Link href="/panel">Mis encuestas</Link>
              <Link href="/panel/cuenta">Cuenta</Link>
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
