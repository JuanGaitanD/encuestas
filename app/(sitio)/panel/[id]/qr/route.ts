import QRCode from "qrcode";
import { loadSurvey } from "@/lib/own-survey";

// Código QR del enlace público, en PNG grande para que sirva en pantalla y también impreso.
export async function GET(req: Request, { params }: RouteContext<"/panel/[id]/qr">) {
  const survey = await loadSurvey((await params).id);
  const png = await QRCode.toBuffer(`${new URL(req.url).origin}/e/${survey.slug}`, { width: 1024, margin: 2, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
}
