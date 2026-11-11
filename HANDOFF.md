# HANDOFF

## Dónde estamos

Primera versión funcional (11 de noviembre de 2026). Probada de punta a punta en local con un navegador: registro, creación, importación de JSON, publicación, respuesta desde un móvil, resumen y CSV.

Desplegada en Vercel (proyecto `encuestas`) con base de datos Neon (`encuestas-db`, región iad1) conectada por la integración del Marketplace.

### 11 de noviembre de 2026

Orden aleatorio de páginas configurable por página (`shuffle`). El orden se sortea en el navegador, se valida en el servidor y se guarda con la respuesta bajo la clave reservada `_orden`.

## Lo que sigue

- Recuperación de contraseña y verificación de correo (requiere un servicio de envío).
- Límite de intentos de ingreso y de envíos.
- Preguntas condicionales.
- Migraciones versionadas en lugar de `CREATE TABLE IF NOT EXISTS`.

## Supuestos vigentes

- La base de datos de producción es Neon y se accede por HTTP.
- Una encuesta cabe en un documento JSON (hasta 400 preguntas).
