import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Users, Plus, Truck, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { ToggleDriverActive } from "@/components/manager/drivers/toggle-active";

export const metadata = { title: "Choferes — Logística SleepBox" };

export default async function DriversPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const drivers = await prisma.user.findMany({
    where: { role: "DRIVER" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      _count: {
        select: {
          shipmentsAssigned: true,
        },
      },
      shipmentsAssigned: {
        where: { status: { in: ["EN_CAMINO", "LISTO_PARA_ENVIAR", "ASIGNADO_CHOFER"] } },
        select: { id: true },
      },
    },
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Choferes</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {drivers.length === 0
                  ? "Sin choferes registrados"
                  : `${drivers.filter((d) => d.active).length} activo${drivers.filter((d) => d.active).length !== 1 ? "s" : ""} de ${drivers.length}`}
              </p>
            </div>
          </div>
          <Link
            href="/drivers/new"
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 h-9 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo chofer
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-700">No hay choferes registrados</p>
            <p className="text-xs text-gray-500 mt-1">
              Creá el primer chofer para asignarle envíos.
            </p>
            <Link
              href="/drivers/new"
              className="mt-4 flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 h-9 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear chofer
            </Link>
          </div>
        ) : (
          <div className="max-w-3xl space-y-2">
            {drivers.map((driver) => {
              const enCurso = driver.shipmentsAssigned.length;
              return (
                <div
                  key={driver.id}
                  className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${
                    driver.active ? "border-gray-200" : "border-gray-100 opacity-60"
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-700">
                      {driver.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{driver.name}</p>
                      {driver.active ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                          <XCircle className="w-3 h-3" /> Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {driver.email}
                      {driver.phone && <span className="ml-2">· {driver.phone}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {enCurso > 0
                        ? `${enCurso} envío${enCurso > 1 ? "s" : ""} en curso`
                        : `${driver._count.shipmentsAssigned} entregados en total`}
                    </p>
                  </div>

                  {/* Toggle activo/inactivo */}
                  <ToggleDriverActive driverId={driver.id} active={driver.active} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
