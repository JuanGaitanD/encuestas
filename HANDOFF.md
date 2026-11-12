# HANDOFF

## Dónde estamos

Primera versión funcional (11 de noviembre de 2026). Probada de punta a punta en local con un navegador: registro, creación, importación de JSON, publicación, respuesta desde un móvil, resumen y CSV.

Desplegada en Vercel (proyecto `encuestas`) con base de datos Neon (`encuestas-db`, región iad1) conectada por la integración del Marketplace.

### 12 de noviembre de 2026

Rediseño completo, sin cambios de función ni de datos (rama `rediseno`, publicada en producción el 12 nov 2026 por avance rápido de `main`). Ojo: en Vercel la vista previa usa la misma `DATABASE_URL` que producción. Sistema «Hoja de respuestas», descrito en `DESIGN.md`: papel claro, tinta grafito y magenta de formulario; Archivo en títulos y Atkinson Hyperlegible Next en el cuerpo. Portada nueva con capturas reales de la app en marcos dibujados con CSS (el celular es un solo componente, `Celular.tsx`), demostraciones que se pueden usar en «Escribe» y «Publica» (`Demos.tsx`, con el mismo `Field` del formulario público y sin guardar nada), cuerpo en bloques y un cierre con un solo objetivo; sus frases nuevas salen del `README` y de la página de privacidad. En escritorio, la lista de encuestas es una tabla, la pregunta abierta del editor muestra la vista previa al lado y los resultados van a dos columnas. No cambiaron `lib/`, `app/actions.ts`, `app/api/`, `app/e/`, `app/Fields.tsx` ni `Editor.tsx`. Probado en local con una encuesta de ejemplo: registro, creación, publicación, respuesta desde un móvil y CSV.


Orden aleatorio de páginas configurable por página (`shuffle`). El orden se sortea en el navegador, se valida en el servidor y se guarda con la respuesta bajo la clave reservada `_orden`.

Revisión de seguridad y pulido visual. Corregido: expresión regular del correo con coste cuadrático, topes de encuestas, respuestas y tamaño, tiempo de respuesta del ingreso, dirección fija al publicar, códigos reservados, cabeceras de seguridad, avance en `sessionStorage`. Interfaz sin subrayados, icono propio y microanimaciones que respetan `prefers-reduced-motion`.

Rediseño de los controles y del editor. `app/Fields.tsx` dibuja cada tipo de pregunta y lo comparten el formulario público y la vista previa del editor; `app/Icon.tsx` es la única familia de iconos. Opciones como filas completas, escala en botones numerados, matriz en tabla (ancho) o en fichas por frase (móvil), barra de avance fija. En el editor: selector de tipo con descripción, preguntas plegables, listas de opciones y filas campo a campo, escalas habituales para las matrices, códigos del CSV en «Opciones avanzadas» y aviso al salir con cambios sin guardar. El formato de `Definition` no cambió.

Tipo de pregunta «Lista desplegable» (`select`). Borrado de una encuesta desde la lista del panel y de una respuesta concreta desde la página de respuestas (`deleteResponse`, que comprueba que la encuesta sea de quien lo pide).

Editores compartidos y servidor MCP. `lib/surveys.ts` reúne las operaciones sobre encuestas con su control de acceso (tabla `survey_editors`); las usan las acciones del panel y `app/api/mcp/route.ts`. El guardado lleva la versión abierta (`updated_at`) y rechaza con `conflict` si otra persona guardó después. Claves de acceso en `api_tokens` (solo el hash), gestionadas en `/panel/conexion`.

## Lo que sigue

- Recuperación de contraseña y verificación de correo (requiere un servicio de envío).
- Límite de tasa por IP para ingreso, registro y envíos (Firewall de Vercel o similar).
- Preguntas condicionales.
- Migraciones versionadas en lugar de `CREATE TABLE IF NOT EXISTS`.

## Supuestos vigentes

- La base de datos de producción es Neon y se accede por HTTP.
- Una encuesta cabe en un documento JSON (hasta 400 preguntas).
