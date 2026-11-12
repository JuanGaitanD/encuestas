import { notFound } from "next/navigation";
import { requireUser } from "./auth";
import { getSurvey } from "./surveys";

/** Carga una encuesta solo si quien tiene la sesión la creó o es una de sus editoras; si no, 404. */
export async function loadSurvey(id: string) {
  const user = await requireUser();
  const survey = await getSurvey(user.id, id);
  if (!survey) notFound();
  return survey;
}
