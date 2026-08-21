import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildGoogleMapsUrl } from "@/lib/route-optimizer";
import { ShipmentStatus } from "@prisma/client";
import {
  Navigation,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  MapPin,
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Mi Recorrido — Logística SleepBox" };

export default async function RoutePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const driverId = session.user.id;

  // Buscar el recorrido más reciente del chofer (sin completar)
  const activeRoute = await prisma.route.findFirst({
    where: {
      driverId,
      completedAt: null,
      startedAt: { not: null },
    },
    orderBy: { startedAt: "desc" },
    include: {
      items: {
        orderBy: { deliveryOrder: "asc" },
        include: {
          shipment: {
            select: {
              id: true,
              recipientName: true,
              addressLine: true,
              city: true,
              status: true,
              lat: true,
              lng: true,
            },
          },
        },
      },
    },
  });

  // Sin recorrido activo
  if (!activeRoute || activeRoute.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Navigation className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-700">Sin recorrido activo</p>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">
          Seleccioná pedidos en "Mis pedidos" e iniciá un recorrido para verlo acá.
        </p>
        <Link
          href="/assignments"
          className="mt-5 bg-blue-600 text-white text-sm font-medium px-5 h-10 rounded-xl flex items-center gap-2"
        >
          Ver mis pedidos
        </Link>
      </div>
    );
  }

  const totalStops = activeRoute.items.length;
  const deliveredCount = activeRoute.items.filter(
    (item) => item.deliveredAt != null
  ).length;
  const allDone = deliveredCount === totalStops;

  // Construir URL de Google Maps con las paradas pendientes
  const pendingItems = activeRoute.items.filter(
    (item) =>
      item.deliveredAt == null && item.shipment.status === ShipmentStatus.EN_CAMINO
  );

  const stopsForMaps = (pendingItems.length > 0 ? pendingItems : activeRoute.items).map(
    (item) => ({
      addressLine: item.shipment.addressLine,
      city: item.shipment.city,
      coordinates:
        item.shipment.lat != null && item.shipment.lng != null
          ? { lat: item.shipment.lat, lng: item.shipment.lng }
          : null,
    })
  );

  const mapsUrl = buildGoogleMapsUrl(stopsForMaps);

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              Recorrido activo
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {deliveredCount} de {totalStops} entregado
              {totalStops !== 1 ? "s" : ""}
            </p>
          </div>

          {mapsUrl && !allDone && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 h-9 rounded-lg shrink-0"
            >
              <Navigation className="w-4 h-4" />
              Abrir Maps
            </a>
          )}
        </div>

        {/* Barra de progreso */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{
              width: `${totalStops > 0 ? (deliveredCount / totalStops) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Mensaje de recorrido completo */}
      {allDone && (
        <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-800">
            ¡Recorrido completado!
          </p>
          <p className="text-xs text-green-600 mt-1">
            Todos los envíos fueron entregados.
          </p>
        </div>
      )}

      {/* Lista de paradas */}
      <div className="p-4 space-y-2">
        {activeRoute.items.map((item) => {
          const isDelivered = item.deliveredAt != null;
          const isIncident = item.shipment.status === ShipmentStatus.INCIDENCIA;

          return (
            <Link
              key={item.id}
              href={`/assignments/${item.shipment.id}`}
              className={`flex items-center gap-3 bg-white border rounded-xl p-3 active:scale-[.98] transition-transform ${
                isDelivered
                  ? "border-green-200 opacity-60"
                  : isIncident
                  ? "border-red-200"
                  : "border-gray-200"
              }`}
            >
              {/* Ícono / número de parada */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  isDelivered
                    ? "bg-green-100 text-green-600"
                    : isIncident
                    ? "bg-red-100 text-red-500"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {isDelivered ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isIncident ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  item.deliveryOrder
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isDelivered ? "line-through text-gray-400" : "text-gray-900"
                  }`}
                >
                  {item.shipment.recipientName}
                </p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                  {item.shipment.addressLine}, {item.shipment.city}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
