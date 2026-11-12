import { q } from "@/lib/db";
import { toCsv, type Answers } from "@/lib/survey";
import { loadSurvey } from "@/lib/own-survey";

export async function GET(_: Request, { params }: RouteContext<"/panel/[id]/csv">) {
  const survey = await loadSurvey((await params).id);
  const rows = await q<{ id: string; created_at: string; answers: Answers }>(
    "SELECT id, created_at, answers FROM responses WHERE survey_id = $1 ORDER BY created_at",
    [survey.id],
  );
  return new Response(toCsv(survey.definition, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${survey.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
