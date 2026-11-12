# HANDOFF

## Dónde estamos

Primera versión funcional (11 de noviembre de 2026). Probada de punta a punta en local con un navegador: registro, creación, importación de JSON, publicación, respuesta desde un móvil, resumen y CSV.

Desplegada en Vercel (proyecto `encuestas`) con base de datos Neon (`encuestas-db`, región iad1) conectada por la integración del Marketplace.

### 11 de noviembre de 2026

Orden aleatorio de páginas configurable por página (`shuffle`). El orden se sortea en el navegador, se valida en el servidor y se guarda con la respuesta bajo la clave reservada `_orden`.

Revisión de seguridad y pulido visual. Corregido: expresión regular del correo con coste cuadrático, topes de encuestas, respuestas y tamaño, tiempo de respuesta del ingreso, dirección fija al publicar, códigos reservados, cabeceras de seguridad, avance en `sessionStorage`. Interfaz sin subrayados, icono propio y microanimaciones que respetan `prefers-reduced-motion`.

Rediseño de los controles y del editor. `app/Fields.tsx` dibuja cada tipo de pregunta y lo comparten el formulario público y la vista previa del editor; `app/Icon.tsx` es la única familia de iconos. Opciones como filas completas, escala en botones numerados, matriz en tabla (ancho) o en fichas por frase (móvil), barra de avance fija. En el editor: selector de tipo con descripción, preguntas plegables, listas de opciones y filas campo a campo, escalas habituales para las matrices, códigos del CSV en «Opciones avanzadas» y aviso al salir con cambios sin guardar. El formato de `Definition` no cambió.

Tipo de pregunta «Lista desplegable» (`select`). Borrado de una encuesta desde la lista del panel y de una respuesta concreta desde la página de respuestas (`deleteResponse`, que comprueba que la encuesta sea de quien lo pide).

## Lo que sigue

- Recuperación de contraseña y verificación de correo (requiere un servicio de envío).
- Límite de tasa por IP para ingreso, registro y envíos (Firewall de Vercel o similar).
- Preguntas condicionales.
- Migraciones versionadas en lugar de `CREATE TABLE IF NOT EXISTS`.

## Supuestos vigentes

- La base de datos de producción es Neon y se accede por HTTP.
- Una encuesta cabe en un documento JSON (hasta 400 preguntas).
