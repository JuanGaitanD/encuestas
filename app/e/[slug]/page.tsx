import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { q } from "@/lib/db";
import type { Definition } from "@/lib/survey";
import { Form } from "./Form";

type Row = { title: string; slug: string; published: boolean; user_id: string; definition: Definition };
const load = async (slug: string) => (await q<Row>("SELECT title, slug, published, user_id, definition FROM surveys WHERE slug = $1", [slug]))[0];

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const survey = await load((await params).slug);
  return { title: survey?.published ? survey.title : "Encuesta", robots: { index: false } };
}

export default async function Page({ params }: PageProps<"/e/[slug]">) {
  const survey = await load((await params).slug);
  if (!survey) notFound();
  // Un borrador solo lo ve su autor, como vista previa que no guarda nada.
  const preview = !survey.published;
  if (preview && (await currentUser())?.id !== survey.user_id) notFound();
  return (
    <>
      <main>
        <Form slug={survey.slug} title={survey.title} def={survey.definition} preview={preview} />
      </main>
      <footer className="foot">
        <span>
          Hecha con <Link href="/">Encuestas</Link>, software libre.
        </span>
        <Link href="/privacidad">Qué se guarda de ti</Link>
      </footer>
    </>
  );
}
