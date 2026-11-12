# HANDOFF

## Dónde estamos

Primera versión funcional (11 de noviembre de 2026). Probada de punta a punta en local con un navegador: registro, creación, importación de JSON, publicación, respuesta desde un móvil, resumen y CSV.

Desplegada en Vercel (proyecto `encuestas`) con base de datos Neon (`encuestas-db`, región iad1) conectada por la integración del Marketplace.

### 11 de noviembre de 2026

Orden aleatorio de páginas configurable por página (`shuffle`). El orden se sortea en el navegador, se valida en el servidor y se guarda con la respuesta bajo la clave reservada `_orden`.

Revisión de seguridad y pulido visual. Corregido: expresión regular del correo con coste cuadrático, topes de encuestas, respuestas y tamaño, tiempo de respuesta del ingreso, dirección fija al publicar, códigos reservados, cabeceras de seguridad, avance en `sessionStorage`. Interfaz sin subrayados, icono propio y microanimaciones que respetan `prefers-reduced-motion`.

## Lo que sigue

- Recuperación de contraseña y verificación de correo (requiere un servicio de envío).
- Límite de tasa por IP para ingreso, registro y envíos (Firewall de Vercel o similar).
- Preguntas condicionales.
- Migraciones versionadas en lugar de `CREATE TABLE IF NOT EXISTS`.

## Supuestos vigentes

- La base de datos de producción es Neon y se accede por HTTP.
- Una encuesta cabe en un documento JSON (hasta 400 preguntas).
