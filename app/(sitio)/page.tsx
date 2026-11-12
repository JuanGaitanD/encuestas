import Link from "next/link";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  const user = await currentUser();
  return (
    <div className="hero">
      <h1>Haz tu encuesta y quédate con tus datos.</h1>
      <p className="lead">
        Escribe las preguntas, comparte un enlace y descarga las respuestas en CSV. Quien responde no necesita cuenta ni
        deja su correo. Código abierto, sin anuncios y sin rastreo.
      </p>
      <div className="row">
        <Link href={user ? "/panel" : "/registro"} className="btn">
          {user ? "Ir a mis encuestas" : "Crear mi primera encuesta"}
        </Link>
        {!user && <Link href="/ingresar">Ya tengo cuenta</Link>}
      </div>

      <ol className="steps">
        <li>
          <h2>Escribe</h2>
          <p>Texto, número, opción única o múltiple, escalas y matrices tipo Likert, repartidas en páginas.</p>
        </li>
        <li>
          <h2>Publica</h2>
          <p>Eliges la dirección del enlace. Puedes incluir un consentimiento que la persona acepta antes de empezar.</p>
        </li>
        <li>
          <h2>Analiza</h2>
          <p>Resumen por pregunta en pantalla y un CSV con una columna por ítem, listo para R, Python o una hoja de cálculo.</p>
        </li>
      </ol>
    </div>
  );
}
