export const metadata = { title: "Privacidad" };

export default function Page() {
  return (
    <article className="prose">
      <h1>Privacidad</h1>
      <h2>Si respondes una encuesta</h2>
      <p>
        No necesitas cuenta. Se guardan tus respuestas y la fecha y hora de envío. La aplicación no guarda tu dirección
        IP, tu correo ni un identificador de tu navegador, y no hay cookies de seguimiento ni analítica de terceros. El
        servicio de alojamiento recibe tu IP para poder entregarte la página, como cualquier sitio web, y puede
        conservarla un tiempo en sus registros técnicos; esos registros no se unen a tus respuestas.
      </p>
      <p>
        Mientras respondes, el avance se guarda en tu propio navegador para que no lo pierdas si recargas la página. Se
        borra al enviar o al cerrar la pestaña. Después de enviar, el navegador recuerda solo que ya respondiste.
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
      <p>
        Si entras con Google, se guardan además el identificador que Google da a tu cuenta y el correo que Google
        confirmó, para reconocerte la próxima vez. No se guarda tu foto ni se pide acceso a nada más de tu cuenta de
        Google. Mientras eliges tu cuenta de Google se usa una cookie temporal que dura diez minutos.
      </p>
      <h2>Código</h2>
      <p>
        El programa es software libre. Puedes revisar qué hace con los datos, o instalar tu propia copia, desde{" "}
        <a href="https://github.com/JuanGaitanD/encuestas">el repositorio</a>.
      </p>
    </article>
  );
}
