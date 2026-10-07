import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PlusCircle, ExternalLink, Copy } from "lucide-react";
const STATUS_LABELS: Record<string, string> = {
  EN_PREPARACION:    "En preparación",
  LISTO_PARA_ENVIAR: "Listo para enviar",
  ASIGNADO_CHOFER:   "Asignado a chofer",
  EN_CAMINO:         "En camino",
  ENTREGADO:         "Entregado",
  INCIDENCIA:        "Incidencia",
  CANCELADO:         "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  EN_PREPARACION:    "bg-gray-100 text-gray-600",
  LISTO_PARA_ENVIAR: "bg-blue-100 text-blue-700",
  ASIGNADO_CHOFER:   "bg-indigo-100 text-indigo-700",
  EN_CAMINO:         "bg-yellow-100 text-yellow-700",
  ENTREGADO:         "bg-green-100 text-green-700",
  INCIDENCIA:        "bg-red-100 text-red-700",
  CANCELADO:         "bg-gray-200 text-gray-500",
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} día${days !== 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months !== 1 ? "es" : ""}`;
  const years = Math.floor(months / 12);
  return `hace ${years} año${years !== 1 ? "s" : ""}`;
}

export const dynamic = "force-dynamic";

async function getAllShipments() {
  return prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      trackingToken: true,
      recipientName: true,
      city: true,
      province: true,
      status: true,
      createdAt: true,
      products: true,
      externalTrackingUrl: true,
      externalTrackingCode: true,
      logisticsCompany: {
        select: { name: true, isInternal: true },
      },
      requestedBy: {
        select: { name: true },
      },
      createdBy: {
        select: { name: true },
      },
    },
  });
}

export default async function OrdersPage() {
  const session = await auth();
  const shipments = await getAllShipments();
  const currentUserId = session?.user?.id;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {shipments.length} pedido{shipments.length !== 1 ? "s" : ""} en el sistema
          </p>
        </div>
        <Link
          href="/orders/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <PlusCircle size={16} />
          Nuevo pedido
        </Link>
      </div>

      {/* Tabla */}
      {shipments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-gray-400 text-sm">No hay pedidos cargados todavía.</p>
          <Link
            href="/orders/new"
            className="mt-4 inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
          >
            <PlusCircle size={14} /> Cargar el primero
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Pedido</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Destinatario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Logística</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Cargado por</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Hace</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Seguimiento</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shipments.map((s) => {
                  const isMyOrder =
                    s.requestedBy?.name === session?.user?.name ||
                    s.createdBy?.name === session?.user?.name;

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        isMyOrder ? "bg-blue-50/30" : ""
                      }`}
                    >
                      {/* Pedido */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {s.orderNumber ? `#${s.orderNumber}` : "—"}
                        </div>
                        {isMyOrder && (
                          <span className="text-xs text-blue-500 font-medium">mi pedido</span>
                        )}
                      </td>

                      {/* Destinatario */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{s.recipientName}</div>
                        <div className="text-gray-400 text-xs">
                          {s.city}, {s.province}
                        </div>
                      </td>

                      {/* Logística */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        {s.logisticsCompany ? (
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                              s.logisticsCompany.isInternal
                                ? "bg-green-50 text-green-700"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {s.logisticsCompany.name}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">Sin asignar</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                            STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABELS[s.status] ?? s.status}
                        </span>
                      </td>

                      {/* Cargado por */}
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                        {s.requestedBy?.name ?? s.createdBy?.name ?? "—"}
                      </td>

                      {/* Hace cuánto */}
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                        {timeAgo(new Date(s.createdAt))}
                      </td>

                      {/* Tracking externo */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        {s.externalTrackingCode || s.externalTrackingUrl ? (
                          <div className="flex flex-col gap-0.5">
                            {s.externalTrackingCode && (
                              <span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                                {s.externalTrackingCode}
                              </span>
                            )}
                            {s.externalTrackingUrl && (
                              <a
                                href={s.externalTrackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-purple-600 hover:underline font-medium"
                              >
                                <ExternalLink size={11} />
                                Seguir envío
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <a
                          href={`/tracking/${s.trackingToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Tracking
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        Las filas con fondo azul claro son pedidos que vos cargaste.
      </p>
    </div>
  );
}
