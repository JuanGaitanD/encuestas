import { loadOwnSurvey } from "@/lib/own-survey";
import { Editor } from "./Editor";

export const metadata = { title: "Editar encuesta" };

export default async function Page({ params }: PageProps<"/panel/[id]">) {
  const survey = await loadOwnSurvey((await params).id);
  return <Editor survey={survey} />;
}
