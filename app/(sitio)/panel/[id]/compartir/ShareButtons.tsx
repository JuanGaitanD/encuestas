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
