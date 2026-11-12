import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { googleConfig } from "@/lib/google";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Crear cuenta" };

export default async function Page({ searchParams }: PageProps<"/registro">) {
  if (await currentUser()) redirect("/panel");
  return <AuthForm mode="register" google={!!googleConfig()} notice={String((await searchParams).google ?? "")} />;
}
