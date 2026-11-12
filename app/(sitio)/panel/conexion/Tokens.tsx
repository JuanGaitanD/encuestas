"use client";

import { useState, useTransition } from "react";
import { newToken } from "@/app/actions";
import { Icon } from "@/app/Icon";

export function NewToken({ url }: { url: string }) {
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const command = `claude mcp add --transport http encuestas ${url} --header "Authorization: Bearer ${token}"`;

  return (
    <div className="stack">
      <form
        className="inviterow"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await newToken(name);
            setError(r.ok ? "" : r.error);
            if (r.ok) {
              setToken(r.token);
              setName("");
            }
          });
        }}
      >
        <label className="grow">
          Nombre para reconocerla
          <input value={name} required maxLength={60} placeholder="Mi computador" onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn" disabled={pending}>
          <Icon name="plus" size={18} /> Crear clave
        </button>
      </form>
      <p className="error" role="alert">
        {error}
      </p>
      {token && (
        <div className="preview" role="status">
          <p>
            <strong>Copia la clave ahora.</strong> No se vuelve a mostrar.
          </p>
          <code className="codeblock">{token}</code>
          <p className="muted">Para conectarla a Claude Code, pega esto en la terminal:</p>
          <code className="codeblock">{command}</code>
          <div>
            <button type="button" className="btn ghost small" onClick={() => navigator.clipboard.writeText(command).then(() => (setCopied(true), setTimeout(() => setCopied(false), 2000)))}>
              <Icon name={copied ? "check" : "copy"} size={18} /> {copied ? "Copiado" : "Copiar el comando"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
