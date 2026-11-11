export const metadata = { title: "Privacidad" };

export default function Page() {
  return (
    <article className="prose">
      <h1>Privacidad</h1>
      <h2>Si respondes una encuesta</h2>
      <p>
        No necesitas cuenta. Se guardan tus respuestas y la fecha y hora de envío. No se guarda tu dirección IP, tu
        correo ni un identificador de tu navegador, y no hay cookies de seguimiento ni analítica de terceros.
      </p>
      <p>
        Mientras respondes, el avance se guarda en tu propio navegador para que no lo pierdas si recargas la página. Se
        borra al enviar.
      </p>
      <p>
        Cada encuesta tiene un responsable, que es quien la creó y quien decide qué pregunta y para qué. Si una pregunta
        te pide datos que te identifican, eso lo decidió esa persona: léelo en la presentación de la encuesta antes de
        aceptar.
      </p>
      <h2>Si creas encuestas</h2>
      <p>
        Se guardan tu nombre, tu correo y tu contraseña cifrada con scrypt. Se usa una única cookie, necesaria para
        mantener tu sesión. Al borrar una encuesta se borran sus respuestas.
      </p>
      <h2>Código</h2>
      <p>
        El programa es software libre. Puedes revisar qué hace con los datos, o instalar tu propia copia, desde{" "}
        <a href="https://github.com/JuanGaitanD/encuestas">el repositorio</a>.
      </p>
    </article>
  );
}
