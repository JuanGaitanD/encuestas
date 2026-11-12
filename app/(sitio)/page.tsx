import Image from "next/image";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { Icon } from "@/app/Icon";
import escritorio from "@/app/capturas/resumen-escritorio.png";
import resumen from "@/app/capturas/resumen.png";
import movilPagina from "@/app/capturas/movil-pagina1.png";
import movilListo from "@/app/capturas/movil-listo.png";
import { Celular } from "./Celular";
import { DemoConsentimiento, DemoTipos } from "./Demos";
import { Escena } from "./Escena";

// Tira decorativa: la fila de burbujas de una hoja de respuestas. La burbuja rellena de cada grupo es fija.
const RELLENAS = [1, 3, 0, 2, 4, 1, 3, 0, 2, 4, 1, 0];

export default async function Home() {
  const user = await currentUser();
  const destino = user ? "/panel" : "/registro";
  const accion = user ? "Ir a mis encuestas" : "Crear mi primera encuesta";
  return (
    <div className="portada">
      <section className="heroe">
        <div className="heroe-texto">
          <h1>
            <strong>Haz tu encuesta</strong> y quédate con tus datos.
          </h1>
          <p className="lead">
            Escribe las preguntas, comparte un enlace y descarga las respuestas en CSV. Quien responde no necesita cuenta ni
            deja su correo. Código abierto, sin anuncios y sin rastreo.
          </p>
          <div className="row">
            <Link href={destino} className="btn grande avanza">
              {accion} <Icon name="arrow" />
            </Link>
            {!user && (
              <Link href="/ingresar" className="btn ghost grande">
                Ya tengo cuenta
              </Link>
            )}
          </div>
          <p className="procedencia">Capturas de la app real. La encuesta y sus respuestas son de ejemplo.</p>
        </div>

        <Escena>
          <div className="marco ventana">
            <Image
              src={escritorio}
              alt="La página de respuestas de una encuesta de ejemplo: el total recibido, el botón para descargar el CSV y el conteo de cada opción en barras."
              sizes="(min-width: 1024px) 640px, 92vw"
              preload
              unoptimized
            />
          </div>
          <Celular>
            <Image
              src={movilPagina}
              alt="La misma encuesta en un celular: barra de avance y una pregunta con sus opciones en filas grandes, una de ellas marcada."
              sizes="(min-width: 1024px) 240px, 34vw"
              preload
              unoptimized
            />
          </Celular>
        </Escena>

        <div className="tira" aria-hidden="true">
          {RELLENAS.map((llena, n) => (
            <span key={n} className="tira-grupo">
              {String(n + 1).padStart(2, "0")}
              {["A", "B", "C", "D", "E"].map((letra, i) => (
                <i key={letra} className={i === llena ? "llena" : undefined} style={{ "--n": n } as React.CSSProperties}>
                  {letra}
                </i>
              ))}
            </span>
          ))}
        </div>
      </section>

      <div className="bloques">
        <section className="bloque bloque-escribe" id="escribe">
          <h2>Escribe</h2>
          <p>Texto, número, opción única o múltiple, escalas y matrices tipo Likert, repartidas en páginas.</p>
          <div className="ficha">
            <DemoTipos />
            <p className="pie">Nueve tipos de pregunta. Pruébalos: es el mismo control que verá quien responde.</p>
          </div>
        </section>

        <section className="bloque bloque-publica" id="publica">
          <h2>Publica</h2>
          <p>Eliges la dirección del enlace. Puedes incluir un consentimiento que la persona acepta antes de empezar.</p>
          <span className="direccion">
            /e/<b>mi-encuesta</b>
          </span>
          <div className="ficha">
            <DemoConsentimiento />
            <p className="pie">Marca la casilla y pulsa «Empezar»: así se ve en el celular.</p>
          </div>
        </section>

        <section className="bloque bloque-promesa">
          <p className="enunciado">
            Quien responde <strong>no necesita cuenta ni deja su correo.</strong>
          </p>
          <p>No se guarda su dirección IP ni un identificador de su navegador, y no hay analítica de terceros.</p>
          <Link href="/privacidad" className="destino">
            Qué se guarda <Icon name="arrow" size={18} />
          </Link>
        </section>

        <section className="bloque bloque-analiza" id="analiza">
          <div className="texto">
            <h2>Analiza</h2>
            <p>Resumen por pregunta en pantalla y un CSV con una columna por ítem, listo para R, Python o una hoja de cálculo.</p>
          </div>
          <figure className="ficha">
            <Image src={resumen} alt="El resumen de respuestas: barras con el conteo de cada opción en tres preguntas de la encuesta de ejemplo." sizes="(min-width: 640px) 560px, 92vw" unoptimized />
            <figcaption>El resumen por pregunta, en pantalla.</figcaption>
          </figure>
          <figure className="ficha">
            <pre className="csv" tabIndex={0} aria-label="Primeras filas y algunas columnas del CSV de la encuesta de ejemplo">
              <b>carrera,horas,lugar,carga,acuerdo_plan,acuerdo_ayuda,acuerdo_descanso</b>
              {"\n"}Ingeniería de Software,6,En casa | En la biblioteca,4,4,5,2
              {"\n"}Ingeniería de Software,10,En la biblioteca,3,2,4,3
              {"\n"}Ingeniería Industrial,12,En las salas de la facultad,5,5,4,1
              {"\n"}Ingeniería de Software,8,En una cafetería | En casa,4,3,4,2
              {"\n"}Diseño,15,En casa,3,4,3,3
              {"\n"}Psicología,9,En la biblioteca,4,2,5,2
              {"\n"}Ingeniería de Software,20,En las salas de la facultad | En una cafetería,5,4,4,1
            </pre>
            <figcaption>El CSV: una columna por pregunta y una por cada fila de las matrices.</figcaption>
          </figure>
        </section>

        <section className="bloque bloque-estudio">
          <h2>Nació para un cuestionario de investigación</h2>
          <dl>
            <div>
              <dt>Orden aleatorio de páginas</dt>
              <dd>
                Cada persona ve las páginas marcadas en un orden sorteado, que queda en la columna <code>orden_paginas</code> del CSV.
              </dd>
            </div>
            <div>
              <dt>Códigos que decides tú</dt>
              <dd>El código de cada pregunta es el nombre de su columna en el CSV.</dd>
            </div>
            <div>
              <dt>Varias personas en una encuesta</dt>
              <dd>Si dos guardan a la vez, la segunda recibe un aviso; nada se pisa en silencio.</dd>
            </div>
            <div>
              <dt>Importar y exportar como JSON</dt>
              <dd>Sirve para copiar una encuesta entre cuentas o versionarla junto a un estudio.</dd>
            </div>
          </dl>
        </section>

        <section className="bloque bloque-libre">
          <p className="enunciado">Código abierto, sin anuncios y sin rastreo.</p>
          <div className="pie">
            <p>Software libre con licencia MIT. Puedes revisar qué hace con los datos o instalar tu propia copia.</p>
            <a href="https://github.com/JuanGaitanD/encuestas" className="destino">
              Código en GitHub <Icon name="external" size={18} />
            </a>
          </div>
        </section>
      </div>

      <section className="cierre">
        <div className="cierre-texto">
          <h2>Crea una cuenta y escribe tu primera pregunta.</h2>
          <p>Para registrarte solo se piden nombre, correo y contraseña.</p>
          <Link href={destino} className="btn grande avanza">
            {accion} <Icon name="arrow" />
          </Link>
        </div>
        <Celular>
          <Image src={movilListo} alt="La pantalla final que ve quien responde: una marca de verificación y el mensaje de agradecimiento." sizes="260px" unoptimized />
        </Celular>
      </section>
    </div>
  );
}
