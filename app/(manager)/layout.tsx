/**
 * Layout del panel del Gestor.
 * Sidebar fija + área de contenido principal.
 * Solo accesible para usuarios con rol MANAGER (enforced por middleware).
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/manager/sidebar";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Doble verificación de seguridad (el middleware ya lo chequea, pero es buena práctica)
  if (!session?.user || session.user.role !== "MANAGER") {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
