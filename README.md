# Encuestas

Aplicación web para crear encuestas, publicarlas con un enlace y descargar las respuestas en CSV. Cualquier persona puede registrarse y publicar la suya. Quien responde no necesita cuenta.

Nació para aplicar un cuestionario de investigación a estudiantes de Ingeniería de Software, y por eso cuida dos cosas: que el formulario se responda bien desde el celular y que los datos salgan listos para analizar.

## Qué hace

- Registro e ingreso con correo y contraseña.
- Editor de encuestas por páginas, con ocho tipos de pregunta: texto corto, texto largo, número, opción única, opción múltiple (ambas con «Otro»), escala, matriz tipo Likert y texto informativo.
- Presentación con consentimiento opcional: una casilla que hay que marcar para empezar.
- Enlace público con la dirección que elijas (`/e/mi-encuesta`). Los borradores solo los ve su autor.
- El avance de quien responde se guarda en su navegador, para que no lo pierda si recarga.
- Resumen por pregunta y descarga en CSV, con una columna por pregunta y una por cada fila de las matrices. El código de cada pregunta lo decides tú, así que las columnas llevan nombres útiles para el análisis.
- Orden aleatorio de páginas: marcas las que deben intercambiarse y cada persona las ve en un orden sorteado. El orden que le tocó a cada quien queda en la columna `orden_paginas` del CSV, para contrabalancear condiciones en un estudio y comprobar después si el orden influyó.
- Importar y exportar la encuesta completa como JSON.

## Qué guarda de quien responde

Las respuestas y la fecha de envío. No guarda dirección IP, correo ni identificadores del navegador, y no carga analítica de terceros.

## Ponerla a andar en tu máquina

Necesitas Node 22.18 o superior y pnpm.

```bash
pnpm install
pnpm dev
```

Abre <http://localhost:3000>. Sin configurar nada, los datos se guardan en un Postgres embebido ([PGlite](https://pglite.dev)) dentro de `.data/`.

```bash
pnpm test    # pruebas del modelo de encuesta
pnpm build   # compilación de producción
```

## Desplegarla

Funciona en cualquier servicio que ejecute Next.js. Necesita una base de datos Postgres a la que se pueda llegar por HTTP con el controlador de [Neon](https://neon.com):

1. Crea una base de datos en Neon (desde Vercel: Storage → Neon).
2. Define la variable de entorno `DATABASE_URL` con la cadena de conexión.
3. Despliega. Las tablas se crean solas en la primera petición.

## Cómo está hecha

| Ruta | Contenido |
|---|---|
| `lib/survey.ts` | Modelo de la encuesta: tipos, saneado de la definición, validación de respuestas y CSV. No depende de nada y tiene sus pruebas en `lib/survey.test.ts`. |
| `lib/db.ts` | Conexión y esquema. |
| `lib/auth.ts` | Contraseñas con scrypt y sesiones por cookie. |
| `app/actions.ts` | Todas las acciones de servidor: cuentas, encuestas y envío de respuestas. |
| `app/(sitio)/` | Portada, registro, ingreso y panel con el editor y los resultados. |
| `app/e/[slug]/` | El formulario público. |

La misma función (`checkAnswer`) valida cada respuesta en el navegador y en el servidor.

## Límites conocidos

- No hay recuperación de contraseña ni verificación de correo.
- No hay límite de intentos de ingreso ni de envíos por persona. El formulario lleva un campo trampa contra bots simples y marca en el navegador que ya se respondió, pero alguien decidido puede responder dos veces.
- No hay preguntas condicionales.

## Licencia

[MIT](LICENSE).
