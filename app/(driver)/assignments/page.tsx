import { auth } from "@/auth";
import { ClipboardList } from "lucide-react";

export const metadata = { title: "Mis Pedidos — Sistema Logístico" };

export default async function AssignmentsPage() {
  const session = await auth();

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Mis pedidos</h2>
        <p className="text-sm text-gray-500">Pedidos asignados para hoy</p>
      </div>

      {/* Placeholder — se implementa en la siguiente etapa con datos reales */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-sm font-medium text-gray-700">Sin pedidos asignados</p>
        <p className="text-xs text-gray-500 mt-1">
          El gestor todavía no te asignó pedidos para hoy.
        </p>
      </div>
    </div>
  );
}
