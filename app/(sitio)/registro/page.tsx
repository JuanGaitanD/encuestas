import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Crear cuenta" };

export default async function Page() {
  if (await currentUser()) redirect("/panel");
  return <AuthForm mode="register" />;
}
