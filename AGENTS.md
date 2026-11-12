# Encuestas

Aplicación web de código abierto para crear, publicar y analizar encuestas. Next.js (App Router) con acciones de servidor y Postgres.

## Idioma

Español neutro en commits, PR, documentación y textos de interfaz. Identificadores de código en inglés.

## Comandos

- `pnpm dev`: desarrollo, con Postgres embebido en `.data/` si no hay `DATABASE_URL`.
- `pnpm test`: pruebas del modelo (`node --test`).
- `pnpm build`: compila y revisa tipos. Debe pasar antes de cada commit.

## Convenciones

- Conventional Commits. Ámbitos: `app`, `datos`, `auth`, `encuesta`, `docs`.
- Toda regla sobre qué es una encuesta o una respuesta válida vive en `lib/survey.ts` y lleva prueba. El formulario y el servidor llaman a la misma función; no se duplica la validación.
- Toda operación sobre una encuesta pasa por `lib/surveys.ts`, que comprueba que la persona la creó o es una de sus editoras. El panel y el servidor MCP llaman a esas mismas funciones; en las páginas se carga con `loadSurvey`. Borrar la encuesta y decidir quién la edita es solo de quien la creó.
- SQL con parámetros, nunca concatenado.
- Sin dependencias nuevas para lo que resuelven unas líneas.

## Qué no tocar

- No guardar IP, agente de usuario ni identificadores de quien responde. Es una promesa de la página de privacidad.
- No cambiar el formato de la definición (`Definition`) sin migrar las encuestas guardadas.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
