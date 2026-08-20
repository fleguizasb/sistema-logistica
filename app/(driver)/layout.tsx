/**
 * Layout del panel del Chofer.
 * Mobile-first: top bar sencilla + bottom navigation.
 * Solo accesible para usuarios con rol DRIVER (enforced por middleware).
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DriverBottomNav } from "@/components/driver/bottom-nav";
import { Package2 } from "lucide-react";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "DRIVER") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar — identificación del chofer */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Package2 className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {session.user.name}
          </p>
          <p className="text-xs text-gray-500">Panel del Chofer</p>
        </div>
      </header>

      {/* Contenido — con padding bottom para el bottom nav */}
      <main className="flex-1 pb-20">{children}</main>

      <DriverBottomNav />
    </div>
  );
}
