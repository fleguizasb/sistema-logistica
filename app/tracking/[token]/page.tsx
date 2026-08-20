/**
 * Página pública de seguimiento de envío.
 * Accesible sin autenticación mediante el token único del envío.
 *
 * Arquitectura de seguridad:
 * - La carga inicial es Server-Side (Prisma + DB) → nunca expone credenciales al browser.
 * - Las actualizaciones en tiempo real usan Supabase Broadcast (solo anon key).
 * - El browser nunca consulta la tabla shipments directamente.
 * - El servidor publica broadcasts cuando cambia el estado.
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL_MAP } from "@/lib/constants/shipment-status";
import { TrackingClient } from "./tracking-client";
import { Package2, MapPin } from "lucide-react";
import type { Metadata } from "next";

interface PageProps {
  params: { token: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Seguimiento de envío — Sistema Logístico`,
    description: "Seguí el estado de tu envío en tiempo real",
    robots: "noindex, nofollow",
  };
}

export default async function TrackingPage({ params }: PageProps) {
  const { token } = params;

  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    notFound();
  }

  // Carga server-side: acceso directo a DB via Prisma (sin exponer nada al browser)
  const shipment = await prisma.shipment.findUnique({
    where: { trackingToken: token },
    select: {
      orderNumber: true,
      status: true,
      recipientName: true,
      city: true,
      province: true,
      updatedAt: true,
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          toStatus: true,
          notes: true,
          incidentType: true,
          createdAt: true,
          createdBy: { select: { role: true } },
        },
      },
    },
  });

  if (!shipment) {
    notFound();
  }

  // Preparar datos serializables para el cliente
  const initialData = {
    orderNumber: shipment.orderNumber,
    status: shipment.status,
    statusLabel: STATUS_LABEL_MAP[shipment.status],
    recipientName: shipment.recipientName,
    city: shipment.city,
    province: shipment.province,
    updatedAt: shipment.updatedAt.toISOString(),
    events: shipment.events.map((e) => ({
      toStatus: e.toStatus,
      statusLabel: STATUS_LABEL_MAP[e.toStatus],
      notes: e.notes ?? null,
      incidentType: e.incidentType ?? null,
      createdAt: e.createdAt.toISOString(),
      actor:
        e.createdBy.role === "MANAGER"
          ? "Gestor"
          : e.createdBy.role === "DRIVER"
          ? "Chofer"
          : "Sistema",
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header público */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Package2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Seguimiento de envío</p>
            {shipment.orderNumber && (
              <p className="text-xs text-gray-500">Pedido #{shipment.orderNumber}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Destinatario y ubicación */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {shipment.recipientName}
              </p>
              {(shipment.city || shipment.province) && (
                <p className="text-sm text-gray-500">
                  {[shipment.city, shipment.province].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Estado actual y historial — componente cliente con Realtime */}
        <TrackingClient
          trackingToken={token}
          initialData={initialData}
        />
      </main>
    </div>
  );
}
