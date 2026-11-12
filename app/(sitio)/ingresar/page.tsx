import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { googleConfig } from "@/lib/google";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Ingresar" };

export default async function Page({ searchParams }: PageProps<"/ingresar">) {
  if (await currentUser()) redirect("/panel");
  return <AuthForm mode="login" google={!!googleConfig()} notice={String((await searchParams).google ?? "")} />;
}
