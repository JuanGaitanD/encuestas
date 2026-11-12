import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { authUrl, googleConfig, randomToken } from "@/lib/google";

// Empieza el inicio de sesión con Google. Con `?conectar=1` y sesión iniciada, enlaza Google a esa cuenta.
export async function GET(req: Request) {
  const cfg = googleConfig();
  if (!cfg) redirect("/ingresar");
  const url = new URL(req.url);
  const connect = url.searchParams.has("conectar");
  if (connect && !(await currentUser())) redirect("/ingresar");
  const flow = { state: randomToken(), nonce: randomToken(), verifier: randomToken(), connect };
  // Vive diez minutos y solo viaja a estas rutas: ata la respuesta de Google a este navegador.
  (await cookies()).set("g_oauth", JSON.stringify(flow), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  redirect(authUrl(cfg.id, url.origin, flow));
}
