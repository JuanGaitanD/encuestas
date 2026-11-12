// Servidor MCP (transporte HTTP, sin estado): deja que un asistente cree, edite, publique y lea
// encuestas en nombre de una persona. Cada petición es un mensaje JSON-RPC y se responde en JSON.
// La identidad sale de una clave personal (Authorization: Bearer enc_…) creada en /panel/conexion.
import { userFromToken } from "@/lib/auth";
import * as S from "@/lib/surveys";

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_BODY = 400_000;

const FORMAT = `Formato de «definicion» (JSON):
{ "intro": "texto de presentación", "consent": "casilla que hay que aceptar (opcional)", "thanks": "mensaje final (opcional)",
  "pages": [ { "title": "…", "description": "(opcional)", "shuffle": false, "questions": [ … ] } ] }
Cada pregunta: { "id": "codigo_csv", "type": "…", "label": "texto", "help": "(opcional)", "required": true|false } más, según el tipo:
- short, long: nada más.
- number: "min", "max" (opcionales).
- single, multi: "options": ["…"], "other": true para admitir «Otro».
- select (lista desplegable): "options": ["…"].
- scale: "points" (2 a 11), "minLabel", "maxLabel".
- matrix: "columns": ["…"] (la escala) y "rows": [{ "id": "codigo", "label": "frase" }].
- info: solo "label"; es un texto que no se responde.
Los "id" empiezan por letra y usan minúsculas, números y guion bajo; no se repiten. Son los nombres de columna del CSV.`;

type Args = Record<string, unknown>;
type Tool = { description: string; properties: Record<string, object>; required?: string[]; run: (userId: string, a: Args, origin: string) => Promise<unknown> };
const text = { type: "string" };
const id = { type: "string", description: "Identificador de la encuesta (el «id» que devuelve listar_encuestas)." };

const TOOLS: Record<string, Tool> = {
  listar_encuestas: {
    description: "Lista las encuestas de la cuenta (propias y compartidas) con su estado y cuántas respuestas tienen.",
    properties: {},
    run: async (userId, _, origin) => (await S.listSurveys(userId)).map((s) => ({ ...s, url: `${origin}/e/${s.slug}` })),
  },
  ver_encuesta: {
    description: `Devuelve una encuesta completa: título, dirección, si está publicada y su definición.\n${FORMAT}`,
    properties: { id },
    required: ["id"],
    run: async (userId, a, origin) => {
      const s = await S.getSurvey(userId, String(a.id));
      return s ? { ...s, url: `${origin}/e/${s.slug}`, editar: `${origin}/panel/${s.id}` } : { ok: false, error: "No se encontró la encuesta." };
    },
  },
  crear_encuesta: {
    description: `Crea una encuesta en borrador. Si no se pasa «definicion» queda con una pregunta de ejemplo.\n${FORMAT}`,
    properties: { titulo: text, definicion: { type: "object" } },
    required: ["titulo"],
    run: async (userId, a, origin) => {
      const r = await S.createSurvey(userId, String(a.titulo ?? ""), a.definicion);
      return r.ok ? { ...r, editar: `${origin}/panel/${r.id}` } : r;
    },
  },
  guardar_encuesta: {
    description: `Cambia el título, la dirección del enlace o la definición de una encuesta. Lo que no se pase se conserva. «definicion» reemplaza la anterior entera: para cambiar una pregunta, lee la encuesta con ver_encuesta, modifica y envía la definición completa.\n${FORMAT}`,
    properties: { id, titulo: text, direccion: { type: "string", description: "Parte final del enlace /e/…; minúsculas, números y guiones. No se puede cambiar si ya está publicada." }, definicion: { type: "object" } },
    required: ["id"],
    run: async (userId, a) => {
      const s = await S.getSurvey(userId, String(a.id));
      if (!s) return { ok: false, error: "No se encontró la encuesta." };
      return S.saveSurvey(userId, s.id, String(a.titulo ?? s.title), String(a.direccion ?? s.slug), a.definicion ?? s.definition, null);
    },
  },
  publicar_encuesta: {
    description: "Publica una encuesta para que reciba respuestas en su enlace, o deja de publicarla.",
    properties: { id, publicada: { type: "boolean" } },
    required: ["id", "publicada"],
    run: (userId, a) => S.setPublished(userId, String(a.id), a.publicada === true),
  },
  descargar_respuestas: {
    description: "Devuelve las respuestas de una encuesta en CSV: una fila por respuesta y una columna por pregunta (o por fila de matriz).",
    properties: { id },
    required: ["id"],
    run: async (userId, a) => (await S.csv(userId, String(a.id))) ?? { ok: false, error: "No se encontró la encuesta." },
  },
};

const reply = (rpcId: unknown, body: object, status = 200) => Response.json({ jsonrpc: "2.0", id: rpcId ?? null, ...body }, { status, headers: { "Cache-Control": "no-store" } });
const fail = (rpcId: unknown, code: number, message: string, status = 200) => reply(rpcId, { error: { code, message } }, status);

// ponytail: sin límite de peticiones por clave; añadirlo (Firewall de Vercel o un contador) si alguien abusa.
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const user = auth.startsWith("Bearer ") ? await userFromToken(auth.slice(7).trim()) : null;
  if (!user) return new Response("Falta una clave válida. Créala en /panel/conexion.", { status: 401, headers: { "WWW-Authenticate": "Bearer" } });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return fail(null, -32600, "Petición demasiado grande.", 413);
  let msg: { id?: unknown; method?: unknown; params?: Args };
  try {
    msg = JSON.parse(raw);
  } catch {
    return fail(null, -32700, "JSON no válido.", 400);
  }
  if (!msg || typeof msg !== "object" || Array.isArray(msg) || typeof msg.method !== "string") return fail(null, -32600, "Mensaje no válido.", 400);
  // Las notificaciones no llevan id y no esperan respuesta.
  if (msg.id === undefined || msg.id === null) return new Response(null, { status: 202 });

  const params = msg.params ?? {};
  switch (msg.method) {
    case "initialize": {
      const asked = String(params.protocolVersion ?? "");
      return reply(msg.id, {
        result: {
          protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
          capabilities: { tools: {} },
          serverInfo: { name: "encuestas", version: "1.0.0" },
          instructions: "Crea, edita, publica y lee encuestas de la cuenta dueña de la clave. Borrar encuestas o respuestas solo se hace desde el panel web.",
        },
      });
    }
    case "ping":
      return reply(msg.id, { result: {} });
    case "tools/list":
      return reply(msg.id, {
        result: {
          tools: Object.entries(TOOLS).map(([name, t]) => ({
            name,
            description: t.description,
            inputSchema: { type: "object", properties: t.properties, required: t.required ?? [] },
          })),
        },
      });
    case "tools/call": {
      const name = String(params.name ?? "");
      if (!Object.hasOwn(TOOLS, name)) return fail(msg.id, -32602, `No existe la herramienta «${name}».`);
      let out: unknown;
      try {
        out = await TOOLS[name].run(user.id, (params.arguments as Args) ?? {}, new URL(req.url).origin);
      } catch {
        out = { ok: false, error: "No se pudo completar la operación." };
      }
      const failed = typeof out === "object" && out !== null && (out as { ok?: boolean }).ok === false;
      return reply(msg.id, {
        result: {
          content: [{ type: "text", text: failed ? (out as { error: string }).error : typeof out === "string" ? out : JSON.stringify(out, null, 1) }],
          isError: failed,
        },
      });
    }
    default:
      return fail(msg.id, -32601, "Método no admitido.");
  }
}

// Este servidor no abre flujos ni guarda sesiones: solo responde a POST.
const notAllowed = () => new Response(null, { status: 405, headers: { Allow: "POST" } });
export { notAllowed as GET, notAllowed as DELETE };
