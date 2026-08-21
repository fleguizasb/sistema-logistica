import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Incidencias — Logística SleepBox" };

export default async function IncidentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const incidents = await prisma.shipment.findMany({
    where: { status: "INCIDENCIA" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      recipientName: true,
      addressLine: true,
      city: true,
      province: true,
      orderNumber: true,
      updatedAt: true,
      assignedDriver: { select: { name: true } },
      events: {
        where: { toStatus: "INCIDENCIA" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { notes: true, createdAt: true, createdBy: { select: { name: true } } },
      },
    },
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Incidencias</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {incidents.length === 0
                ? "Sin incidencias activas"
                : `${incidents.length} envío${incidents.length > 1 ? "s" : ""} con incidencia`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No hay incidencias activas</p>
            <p className="text-xs text-gray-500 mt-1">
              Cuando un chofer reporte un problema, aparecerá acá.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {incidents.map((s) => {
              const lastEvent = s.events[0];
              return (
                <Link
                  key={s.id}
                  href={`/shipments/${s.id}`}
                  className="block bg-white border border-red-200 rounded-xl p-4 hover:border-red-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{s.recipientName}</p>
                        {s.orderNumber && (
                          <span className="text-xs text-gray-400">#{s.orderNumber}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.addressLine}, {s.city}
                        {s.assignedDriver && (
                          <span className="ml-2 text-gray-400">
                            · Chofer: {s.assignedDriver.name}
                          </span>
                        )}
                      </p>

                      {lastEvent?.notes && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <div className="w-1 h-full rounded-full bg-red-300 shrink-0 mt-1" />
                          <p className="text-sm text-red-700 italic">
                            "{lastEvent.notes}"
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-2">
                        Reportado por {lastEvent?.createdBy.name ?? "—"} ·{" "}
                        {new Date(lastEvent?.createdAt ?? s.updatedAt).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
