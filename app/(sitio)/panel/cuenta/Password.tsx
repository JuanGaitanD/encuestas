"use client";

import { useActionState } from "react";
import { setPassword, type FormState } from "@/app/actions";

/** Crea la contraseña (cuenta que entró con Google) o la cambia (pide la actual). */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState<FormState & { done?: boolean }, FormData>(setPassword, {});
  // Tras guardar, la cuenta ya tiene contraseña aunque la página aún no se haya vuelto a cargar.
  const has = hasPassword || !!state.done;
  return (
    <form action={action} className="stack" key={state.done ? "hecho" : "form"}>
      {has && (
        <label>
          Contraseña actual
          <input name="current" type="password" required autoComplete="current-password" placeholder="La que usas hoy" />
        </label>
      )}
      <label>
        {has ? "Contraseña nueva" : "Contraseña"}
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
        <small>Mínimo 8 caracteres.</small>
      </label>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {state.done && (
        <p className="ok" role="status">
          Contraseña guardada.
        </p>
      )}
      <button className="btn" disabled={pending} aria-busy={pending}>
        {pending ? "Guardando…" : has ? "Cambiar contraseña" : "Crear contraseña"}
      </button>
    </form>
  );
}
