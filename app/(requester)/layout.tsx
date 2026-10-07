import { auth } from "@/auth";
import { redirect } from "next/navigation";
import RequesterSidebar from "@/components/requester/sidebar";

export default async function RequesterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role !== "SOLICITANTE" && role !== "MANAGER") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — oculto en mobile, visible en desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <RequesterSidebar user={session.user} />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header mobile */}
        <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-gray-800">Pedidos</span>
          <span className="text-sm text-gray-500">{session.user.name}</span>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
