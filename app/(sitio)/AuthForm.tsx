"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type FormState } from "@/app/actions";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const [state, action, pending] = useActionState<FormState, FormData>(isRegister ? register : login, {});
  return (
    <form action={action} className="card narrow stack">
      <h1>{isRegister ? "Crear cuenta" : "Ingresar"}</h1>
      {isRegister && (
        <label>
          Nombre
          <input name="name" required maxLength={80} autoComplete="name" />
        </label>
      )}
      <label>
        Correo
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Contraseña
        <input
          name="password"
          type="password"
          required
          minLength={isRegister ? 8 : undefined}
          autoComplete={isRegister ? "new-password" : "current-password"}
        />
        {isRegister && <small>Mínimo 8 caracteres.</small>}
      </label>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn" disabled={pending}>
        {pending ? "Un momento…" : isRegister ? "Crear cuenta" : "Ingresar"}
      </button>
      <p className="muted">
        {isRegister ? (
          <>
            ¿Ya tienes cuenta? <Link href="/ingresar">Ingresa</Link>
          </>
        ) : (
          <>
            ¿No tienes cuenta? <Link href="/registro">Créala</Link>
          </>
        )}
      </p>
    </form>
  );
}
