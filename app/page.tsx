import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role === "MANAGER") redirect("/dashboard");
  if (role === "DRIVER") redirect("/assignments");
  if (role === "SOLICITANTE") redirect("/orders");

  redirect("/login");
}
