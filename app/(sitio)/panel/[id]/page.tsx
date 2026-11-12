import { loadSurvey } from "@/lib/own-survey";
import { listEditors } from "@/lib/surveys";
import { Editor } from "./Editor";

export const metadata = { title: "Editar encuesta" };

export default async function Page({ params }: PageProps<"/panel/[id]">) {
  const survey = await loadSurvey((await params).id);
  return <Editor survey={survey} editors={survey.owner ? await listEditors(survey.id) : []} />;
}
