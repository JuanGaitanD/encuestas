import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser, startSession } from "@/lib/auth";
import { exchange, signInWithGoogle } from "@/lib/google";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Vuelta de Google: comprueba que la respuesta es de este navegador, lee quién es y decide a qué cuenta entra.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const raw = jar.get("g_oauth")?.value;
  jar.delete({ name: "g_oauth", path: "/api/auth/google" });
  let flow: { state: string; nonce: string; verifier: string; connect: boolean } | null = null;
  try {
    flow = raw ? JSON.parse(raw) : null;
  } catch {}
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const back = (reason: string): never => redirect(`${flow?.connect ? "/panel/cuenta" : "/ingresar"}?google=${reason}`);
  if (!flow || !code || !same(state, flow.state)) return back("cancelado");

  const claims = await exchange(code, flow.verifier, url.origin, flow.nonce);
  if (!claims) return back("fallo");

  if (flow.connect) {
    const user = await currentUser();
    if (!user) redirect("/ingresar");
    const r = await signInWithGoogle(claims, user.id);
    redirect(`/panel/cuenta?google=${r.ok ? "conectado" : r.reason}`);
  }
  const r = await signInWithGoogle(claims);
  if (!r.ok) return back(r.reason);
  await startSession(r.userId);
  redirect("/panel");
}
