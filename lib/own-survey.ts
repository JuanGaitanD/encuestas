import { notFound } from "next/navigation";
import { requireUser } from "./auth";
import { q } from "./db";
import type { Definition } from "./survey";

/** Carga una encuesta solo si pertenece a quien tiene la sesión; si no, 404. */
export async function loadOwnSurvey(id: string) {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [survey] = await q<{ id: string; title: string; slug: string; published: boolean; definition: Definition }>(
    "SELECT id, title, slug, published, definition FROM surveys WHERE id = $1 AND user_id = $2",
    [id, user.id],
  );
  if (!survey) notFound();
  return survey;
}
