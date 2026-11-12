# Encuestas

Aplicación web para crear encuestas, publicarlas con un enlace y descargar las respuestas en CSV. Cualquier persona puede registrarse y publicar la suya. Quien responde no necesita cuenta.

Nació para aplicar un cuestionario de investigación a estudiantes de Ingeniería de Software, y por eso cuida dos cosas: que el formulario se responda bien desde el celular y que los datos salgan listos para analizar.

## Qué hace

- Registro e ingreso con correo y contraseña.
- Editor de encuestas por páginas, con nueve tipos de pregunta: texto corto, texto largo, número, opción única, lista desplegable, opción múltiple (única y múltiple con «Otro»), escala, matriz tipo Likert y texto informativo.
- Presentación con consentimiento opcional: una casilla que hay que marcar para empezar.
- Enlace público con la dirección que elijas (`/e/mi-encuesta`). Los borradores solo los ve su autor.
- El avance de quien responde se guarda en su navegador, para que no lo pierda si recarga.
- Resumen por pregunta y descarga en CSV, con una columna por pregunta y una por cada fila de las matrices. El código de cada pregunta lo decides tú, así que las columnas llevan nombres útiles para el análisis.
- Orden aleatorio de páginas: marcas las que deben intercambiarse y cada persona las ve en un orden sorteado. El orden que le tocó a cada quien queda en la columna `orden_paginas` del CSV, para contrabalancear condiciones en un estudio y comprobar después si el orden influyó.
- Importar y exportar la encuesta completa como JSON.
- Varias personas en una encuesta: quien la crea añade a otras cuentas por su correo. Si dos guardan a la vez, la segunda recibe un aviso y decide si carga la versión de la otra o guarda la suya encima; nada se pisa en silencio.
- Servidor MCP para que un asistente (Claude u otro) cree, edite, publique y lea encuestas. Ver «Conectar un asistente».

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

## Conectar un asistente

La aplicación expone un servidor MCP en `/api/mcp` (transporte HTTP, sin estado). Entra con tu cuenta, abre «Conectar por MCP» en el panel y crea una clave; la página muestra el comando listo para Claude Code:

```
claude mcp add --transport http encuestas https://tu-dominio/api/mcp --header "Authorization: Bearer enc_…"
```

Herramientas: `listar_encuestas`, `ver_encuesta`, `crear_encuesta`, `guardar_encuesta`, `publicar_encuesta` y `descargar_respuestas`. Una clave actúa como la cuenta que la creó y se puede revocar en la misma página. Por MCP no se borran encuestas ni respuestas.

## Cómo está hecha

| Ruta | Contenido |
|---|---|
| `lib/survey.ts` | Modelo de la encuesta: tipos, saneado de la definición, validación de respuestas y CSV. No depende de nada y tiene sus pruebas en `lib/survey.test.ts`. |
| `lib/db.ts` | Conexión y esquema. |
| `lib/auth.ts` | Contraseñas con scrypt, sesiones por cookie y claves de acceso para MCP. |
| `lib/surveys.ts` | Operaciones sobre encuestas con su control de acceso (dueño y editores). Pruebas en `lib/surveys.test.ts`. |
| `app/api/mcp/route.ts` | Servidor MCP. |
| `app/actions.ts` | Todas las acciones de servidor: cuentas, encuestas y envío de respuestas. |
| `app/(sitio)/` | Portada, registro, ingreso y panel con el editor y los resultados. |
| `app/e/[slug]/` | El formulario público. |

La misma función (`checkAnswer`) valida cada respuesta en el navegador y en el servidor.

## Límites conocidos

- No hay recuperación de contraseña ni verificación de correo.
- No hay límite de intentos de ingreso ni de envíos por persona. El formulario lleva un campo trampa contra bots simples y marca en el navegador que ya se respondió, pero alguien decidido puede responder dos veces.
- No hay preguntas condicionales.
- La edición compartida no es en vivo: no ves lo que escribe la otra persona hasta que guarda y recargas.
- El servidor MCP no limita peticiones por clave.
- Topes para proteger la base de datos compartida: 20 encuestas por cuenta, 5000 respuestas por encuesta y 60 kB por respuesta. Están en `app/actions.ts` y `lib/surveys.ts`.
- La dirección de una encuesta no se puede cambiar cuando está publicada o ya tiene respuestas.

## Licencia

[MIT](LICENSE).
