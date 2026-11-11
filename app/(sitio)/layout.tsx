import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { logout } from "@/app/actions";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  return (
    <>
      <header className="top">
        <Link href="/" className="brand">
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
      <main>{children}</main>
      <footer className="foot">
        <span>Software libre con licencia MIT.</span>
        <a href="https://github.com/JuanGaitanD/encuestas">Código en GitHub</a>
        <Link href="/privacidad">Privacidad</Link>
      </footer>
    </>
  );
}
