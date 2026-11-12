"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/app/Icon";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  // El menú de compartir del sistema solo existe en algunos navegadores (sobre todo en el celular).
  const [native, setNative] = useState(false);
  useEffect(() => setNative(typeof navigator.share === "function"), []);

  return (
    <div className="row">
      <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(url).then(() => (setCopied(true), setTimeout(() => setCopied(false), 2000)))}>
        <Icon name={copied ? "check" : "copy"} size={18} /> {copied ? "Copiado" : "Copiar el enlace"}
      </button>
      {native && (
        <button type="button" className="btn ghost" onClick={() => navigator.share({ title, url }).catch(() => {})}>
          <Icon name="external" size={18} /> Enviar por una aplicación
        </button>
      )}
    </div>
  );
}

export function CopyQr({ src }: { src: string }) {
  const [state, setState] = useState<"" | "ok" | "error">("");
  // Copiar imágenes al portapapeles no existe en todos los navegadores; sin soporte, el botón no aparece.
  const [can, setCan] = useState(false);
  useEffect(() => setCan(typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write), []);
  if (!can) return null;
  const copy = () =>
    // La imagen se pasa como promesa para que Safari acepte la copia dentro del mismo clic.
    navigator.clipboard
      .write([new ClipboardItem({ "image/png": fetch(src).then((r) => (r.ok ? r.blob() : Promise.reject())) })])
      .then(() => "ok" as const, () => "error" as const)
      .then((s) => (setState(s), setTimeout(() => setState(""), 2500)));
  return (
    <button type="button" className="btn ghost" onClick={copy}>
      <Icon name={state === "ok" ? "check" : "copy"} size={18} />{" "}
      <span role="status">{state === "ok" ? "Copiado" : state === "error" ? "No se pudo copiar" : "Copiar el QR"}</span>
    </button>
  );
}
