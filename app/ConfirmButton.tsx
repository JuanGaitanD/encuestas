"use client";

import { useTransition } from "react";

/** Botón para acciones que no se pueden deshacer: pregunta antes de ejecutar la acción de servidor. */
export function ConfirmButton(p: { action: () => Promise<void>; message: string; label: string; children: React.ReactNode }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="iconbtn danger" aria-label={p.label} title={p.label} disabled={pending} onClick={() => confirm(p.message) && start(() => p.action())}>
      {p.children}
    </button>
  );
}
