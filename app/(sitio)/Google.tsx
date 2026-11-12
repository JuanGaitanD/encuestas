/** Lo que se le dice a la persona cuando Google devuelve algo que no deja entrar o enlazar. */
export const GOOGLE_MESSAGES: Record<string, string> = {
  cancelado: "No se completó el ingreso con Google. Inténtalo de nuevo.",
  fallo: "Google no respondió como se esperaba. Inténtalo de nuevo.",
  sin_verificar: "Google no ha confirmado ese correo, así que no se puede usar para entrar.",
  correo_distinto: "Ese Google usa otro correo. Solo se puede conectar el Google del mismo correo de tu cuenta.",
  otra_cuenta: "Ese Google ya está conectado a otra cuenta.",
  cuenta_con_otro_google: "Esta cuenta ya tiene otro Google conectado.",
  conectado: "Google quedó conectado. Ya puedes entrar con Google o con tu contraseña.",
};

/** Botón secundario del sistema con el logotipo de Google. Es un enlace: el ingreso empieza en una ruta del servidor. */
export function GoogleButton({ connect = false }: { connect?: boolean }) {
  return (
    <a className="btn ghost google" href={connect ? "/api/auth/google?conectar=1" : "/api/auth/google"}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.300v3.100A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.3 14.300a7.2 7.2 0 0 1 0-4.600V6.600H1.300a12 12 0 0 0 0 10.800l4-3.100z" />
        <path fill="#EA4335" d="M12 4.800c1.8 0 3.3.6 4.6 1.800l3.4-3.400A12 12 0 0 0 1.3 6.600l4 3.100c.900-2.9 3.6-4.9 6.7-4.900z" />
      </svg>
      {connect ? "Conectar Google" : "Continuar con Google"}
    </a>
  );
}
