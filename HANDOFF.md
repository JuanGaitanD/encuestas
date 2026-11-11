# HANDOFF

## Dónde estamos

Primera versión funcional (11 de noviembre de 2026). Probada de punta a punta en local con un navegador: registro, creación, importación de JSON, publicación, respuesta desde un móvil, resumen y CSV.

## Lo que sigue

- Recuperación de contraseña y verificación de correo (requiere un servicio de envío).
- Límite de intentos de ingreso y de envíos.
- Preguntas condicionales y orden aleatorio de páginas, útil para contrabalancear condiciones en estudios.
- Migraciones versionadas en lugar de `CREATE TABLE IF NOT EXISTS`.

## Supuestos vigentes

- La base de datos de producción es Neon y se accede por HTTP.
- Una encuesta cabe en un documento JSON (hasta 400 preguntas).
