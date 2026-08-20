/**
 * Ruta raíz — el middleware redirige al panel correcto según rol.
 * Este componente solo se muestra si el middleware falla (fallback).
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "MANAGER") {
    redirect("/dashboard");
  }

  redirect("/assignments");
}
