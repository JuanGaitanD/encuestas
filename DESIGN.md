# Diseño: «Hoja de respuestas»

El sistema visual de Encuestas sale de la encuesta en papel que todo el mundo ha llenado: la hoja de respuestas con burbujas. Papel claro, tinta grafito y un solo acento, el magenta de la tinta de formulario. La burbuja (vacía con contorno, rellena al elegir) es la marca de selección en toda la app y el motivo de la portada. El isotipo es esa misma burbuja rellenándose a lápiz: un círculo magenta con un trazo de grafito que se dibuja al cargar y al pasar el cursor.

Todo vive en `app/globals.css`; no hay librería de componentes. Las reglas de abajo son las que hay que respetar al añadir o cambiar una pantalla.

## Reglas

- **Ningún texto subrayado**, en reposo, hover ni foco. Un destino suelto responde con fondo tenue; un enlace dentro de un párrafo lleva además un resaltado en reposo (`--marca-suave`), para no depender solo del color.
- **Elevación declarada una vez:** las fichas llevan un borde de 1 px y ninguna sombra. La única sombra es la de los marcos de dispositivo de la portada, que no llevan borde.
- **Ningún bloque con más del 60 % de su caja vacío.** Se corrige escalando lo real o recomponiendo, no rellenando.
- **Sin kicker** sobre los títulos, sin tarjetas iguales de icono + título + texto, sin ficha dentro de ficha.
- **Nada inventado:** la portada solo afirma lo que el código y el `README` respaldan, y sus capturas son de la app real con una encuesta de ejemplo (lo dice la línea de procedencia).
- **Un solo acento.** El verde (`--exito`) y el rojo (`--peligro`) son estados, no decoración.

## Color

| Rol | Variable | Valor | Uso |
|---|---|---|---|
| Fondo de página | `--papel` | `#f7f4f6` | Fondo general, segunda capa dentro de fichas |
| Superficie | `--hoja` | `#ffffff` | Fichas, campos, cabecera, pie, barra de guardado |
| Texto | `--tinta` | `#201a1f` | Texto, bloque oscuro, bisel de los marcos |
| Texto secundario | `--tinta-2` | `#5c5159` | Ayudas, metadatos (6,8:1 sobre papel) |
| Separador | `--linea` | `#e6dfe4` | Borde de fichas y separadores |
| Borde de control | `--borde` | `#8d8490` | Campos, opciones, escala (3:1 sobre la hoja) |
| Acento | `--marca` | `#c2185b` | Acción principal, selección, avance (5,9:1 con blanco) |
| Acento fuerte | `--marca-fuerte` | `#9b1048` | Hover y pulsado |
| Acento suave | `--marca-suave` | `#fce7ef` | Fondo de lo seleccionado, resaltado de enlaces, cierre |
| Éxito | `--exito` / `--exito-suave` | `#17693f` / `#e3f3ea` | «Publicada», «Cambios guardados» |
| Peligro | `--peligro` / `--peligro-suave` | `#b3261e` / `#fbe9e7` | Errores y acciones destructivas |
| Aviso | `--aviso-suave` | `#fff1c2` | Franja de vista previa del borrador |
| Foco inverso | `--foco-inverso` | `#ffffff` | Anillo de foco sobre tinta o marca |

Los neutros van teñidos hacia el magenta. Sobre el bloque oscuro, el texto secundario es `#d9cfd6` y el énfasis `#ff8fb8`.

## Tipografía

- **Títulos:** Archivo, con su eje de ancho al 88 % (82 % en los titulares de la portada), peso 800, `letter-spacing: -0.02em` y `word-spacing: 0.08em`. Se usa en `h1`, `h2`, la marca, las cifras grandes y los enunciados de la portada.
- **Cuerpo:** Atkinson Hyperlegible Next. La encuesta se responde desde el celular y debe leerla cualquiera.
- **Código y datos crudos:** la pila monoespaciada del sistema (`--mono`): direcciones `/e/…`, claves, CSV.
- **Escala de la app (fija, en rem):** 0,85 · 0,9 · 0,95 · 1 · 1,0625 · 1,125 · 1,375 (`h2`) · 2,25 (`h1`; 1,875 en móvil). Solo la portada usa tamaños fluidos con `clamp()`, hasta 5,5 rem.
- Cifras con `tabular-nums`; las de los resultados van en Archivo.

## Espacio y forma

- Escala de espacio: 4 · 8 · 12 · 16 · 24 · 32 · 48 px. Relleno de ficha 24 px (16 en móvil).
- Radios: 10 px en campos (`--r-control`), 12 px en botones y opciones, 14 px en fichas (`--r-ficha`), 16 px en los bloques de la portada, píldora solo en etiquetas y `chip`.
- Anchos de `main`: 820 px por defecto (lectura, formulario público), 1120 px en panel, editor y resultados, 980 px en acceso, sin límite en la portada. Cabecera y pie cruzan la ventana de lado a lado; su contenido se limita con `--lateral`.

## Componentes

- **Botones** (`.btn`): relleno magenta el principal (50 px de alto; `.grande` 56 px en la portada), `.ghost` con contorno el secundario, `.text` el terciario, `.danger` el destructivo, `.dashed` para «añadir». Borde de 1,5 px, radio de 12 px, pulsado con `translateY(1px)`. `.avanza` desplaza la flecha 4 px en hover y foco.
- **Campos:** borde de 1,5 px en `--borde`, 46 px de alto, 16 px de texto. Foco con contorno magenta de 2 px. Error con `aria-invalid` y texto en `--peligro`.
- **Marca de selección** (`.mark`): burbuja de 22 px, rellena de magenta al elegir; la opción entera es una fila tocable de 52 px que se tiñe al elegirse. El control nativo sigue ahí, invisible, para teclado y lectores.
- **Foco:** contorno de 2 px en `--tinta` con 2 px de separación; blanco sobre los bloques oscuro y magenta. Todo objetivo interactivo mide 44 px o más.
- **Fichas** (`.card`, `.panel`): hoja blanca, borde de 1 px, sin sombra.
- **Etiqueta de estado** (`.tag`): píldora con una burbuja; rellena y verde si está publicada.
- **Iconos:** una sola familia en `app/Icon.tsx`, trazo de 2 px, siempre al lado de su texto, nunca dentro de un recuadro.

## Pantallas

- **Portada (persuadir):** héroe a dos columnas con las capturas reales en marcos dibujados con CSS (`.marco.ventana` y `.marco.celular`), siempre rectos y sin perspectiva para que el texto de la captura se lea nítido. Cada captura muestra una pantalla completa, no un recorte a media página, y se sirve sin recomprimir (`unoptimized`), tira de burbujas que cuelga del borde del héroe, cuerpo en bloques de papeles distintos sobre una rejilla de 12 (Escribe, Publica, franja oscura de la promesa, Analiza con el CSV, lista para investigación, enunciado grande en magenta) y un cierre con un solo objetivo. Las capturas están en `app/capturas/` y se regeneran con la app corriendo.
- **Panel, editor y resultados (operar):** la marca vive en los detalles. Desde 1024 px, la lista de encuestas es una tabla de una línea por encuesta, los datos generales van a dos columnas y la pregunta abierta muestra su vista previa fija a la derecha. Los resultados van en dos columnas en orden de lectura; matrices, textos y cifras cruzan las dos.
- **Formulario público:** una columna de 680 px, barra de avance fija arriba, sin cabecera del sitio. La pantalla final («Listo») va centrada.

## Movimiento

- Transiciones de 160 ms con `cubic-bezier(0.22, 1, 0.36, 1)` en color, borde y `transform`; entradas de 220 a 300 ms en lo que se despliega. Nada retrasa una acción.
- La portada entra una sola vez (el texto sube escalonado, la escena aparece) y su escena sigue al cursor con suavizado (`app/(sitio)/Escena.tsx`; el celular y la ventana se desplazan unos píxeles en sentidos opuestos, sin giros): solo con puntero fino, desde 1024 px, y se detiene al llegar a su destino. Las burbujas de la tira se rellenan al pasar el cursor.
- Con `prefers-reduced-motion: reduce` no hay animaciones ni transiciones y la escena queda quieta.

## Excepciones registradas

- El botón principal lleva un degradado vertical casi imperceptible (8 % de blanco a 8 % de negro) para darle cuerpo sin sombra. Es deliberado.
- El cierre de la portada no lleva código QR: quien crea una encuesta ya está frente al computador.
