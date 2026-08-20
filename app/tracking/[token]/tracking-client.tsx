"use client";

/**
 * Componente cliente para el tracking en tiempo real.
 *
 * Arquitectura de seguridad del Realtime:
 * - Se suscribe al canal de Broadcast `tracking:{token}` usando la ANON KEY.
 * - El canal de Broadcast NO accede a ninguna tabla de la DB.
 * - Los datos llegan SOLO cuando el SERVIDOR publica (tras cambiar un estado).
 * - El cliente no puede suscribirse a otros envíos sin conocer su UUID exacto.
 * - El UUID tiene 2^122 combinaciones → inimaginable por fuerza bruta.
 *
 * Si Supabase no está configurado, la página sigue funcionando con datos
 * del servidor (sin tiempo real). No rompe la experiencia.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Truck, Package, PackageCheck } from "lucide-react";
import { ShipmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type TrackingEvent = {
  toStatus: string;
  statusLabel: string;
  notes: string | null;
  incidentType: string | null;
  createdAt: string;
  actor: string;
};

type TrackingData = {
  orderNumber: string | null;
  status: string;
  statusLabel: string;
  recipientName: string;
  city: string | null;
  province: string | null;
  updatedAt: string;
  events: TrackingEvent[];
};

interface TrackingClientProps {
  trackingToken: string;
  initialData: TrackingData;
}

// Íconos por estado
const STATUS_ICON: Record<string, React.ElementType> = {
  EN_PREPARACION: Package,
  LISTO_PARA_ENVIAR: PackageCheck,
  ASIGNADO_CHOFER: Truck,
  EN_CAMINO: Truck,
  ENTREGADO: CheckCircle2,
  INCIDENCIA: AlertTriangle,
  CANCELADO: XCircle,
};

// Colores por estado
const STATUS_COLOR: Record<string, string> = {
  EN_PREPARACION: "text-gray-600 bg-gray-100",
  LISTO_PARA_ENVIAR: "text-blue-600 bg-blue-100",
  ASIGNADO_CHOFER: "text-purple-600 bg-purple-100",
  EN_CAMINO: "text-yellow-600 bg-yellow-100",
  ENTREGADO: "text-green-600 bg-green-100",
  INCIDENCIA: "text-red-600 bg-red-100",
  CANCELADO: "text-orange-600 bg-orange-100",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function TrackingClient({ trackingToken, initialData }: TrackingClientProps) {
  const [data, setData] = useState<TrackingData>(initialData);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Importación dinámica del cliente Supabase (solo si las env vars están configuradas)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Supabase no configurado — tracking estático, sin error visible al usuario
      return;
    }

    let channel: ReturnType<typeof import("@supabase/supabase-js").createClient>["channel"] extends ((...args: infer A) => infer R) ? R : never;

    import("@/lib/supabase/client")
      .then(({ getSupabaseBrowserClient }) => {
        const supabase = getSupabaseBrowserClient();

        // Suscripción al canal de Broadcast específico de este envío
        channel = supabase.channel(`tracking:${trackingToken}`, {
          config: { broadcast: { self: false } },
        });

        channel
          .on("broadcast", { event: "status_update" }, (payload) => {
            // El servidor publicó una actualización — actualizar UI sin recargar
            const update = payload.payload as TrackingData;
            setData((prev) => ({ ...prev, ...update }));
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              setIsLive(true);
            }
          });
      })
      .catch(() => {
        // Si falla la importación, el tracking sigue funcionando sin tiempo real
      });

    return () => {
      // Limpiar suscripción al desmontar
      if (channel) {
        import("@/lib/supabase/client").then(({ getSupabaseBrowserClient }) => {
          getSupabaseBrowserClient().removeChannel(channel);
        });
      }
      setIsLive(false);
    };
  }, [trackingToken]);

  const StatusIcon = STATUS_ICON[data.status] ?? Package;
  const statusColor = STATUS_COLOR[data.status] ?? "text-gray-600 bg-gray-100";

  return (
    <>
      {/* Estado actual */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-4">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", statusColor)}>
            <StatusIcon className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Estado actual
            </p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {data.statusLabel}
            </p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Actualizado {formatDate(data.updatedAt)}
            </p>
          </div>
        </div>

        {/* Indicador de conexión en vivo */}
        {isLive && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-gray-500">Actualización en tiempo real activa</span>
          </div>
        )}
      </div>

      {/* Historial de estados */}
      {data.events.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Historial del envío
          </h3>
          <div className="space-y-0">
            {[...data.events].reverse().map((event, idx) => {
              const EventIcon = STATUS_ICON[event.toStatus] ?? Package;
              const color = STATUS_COLOR[event.toStatus] ?? "text-gray-600 bg-gray-100";
              const isFirst = idx === 0;

              return (
                <div key={idx} className="flex gap-3 pb-4 last:pb-0">
                  {/* Línea de tiempo */}
                  <div className="flex flex-col items-center">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", color)}>
                      <EventIcon className="w-3.5 h-3.5" />
                    </div>
                    {idx < data.events.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 mt-1" />
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 pb-4 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-medium", isFirst ? "text-gray-900" : "text-gray-600")}>
                        {event.statusLabel}
                      </p>
                      <p className="text-xs text-gray-400 shrink-0">
                        {formatDate(event.createdAt)}
                      </p>
                    </div>
                    {event.notes && (
                      <p className="text-xs text-gray-500 mt-0.5">{event.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
