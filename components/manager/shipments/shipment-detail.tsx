"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateShipmentStatus } from "@/lib/actions/shipments";
import {
  STATUS_LABEL_MAP,
  VALID_TRANSITIONS,
} from "@/lib/constants/shipment-status";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShipmentStatus } from "@prisma/client";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Package,
  Clock,
  User,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ShipmentEvent {
  id: string;
  fromStatus: ShipmentStatus | null;
  toStatus: ShipmentStatus;
  notes: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string };
}

interface ShipmentDetailProps {
  shipment: {
    id: string;
    trackingToken: string;
    orderNumber: string | null;
    source: string;
    status: ShipmentStatus;
    recipientName: string;
    recipientPhone: string | null;
    addressLine: string;
    addressExtra: string | null;
    city: string;
    province: string;
    postalCode: string | null;
    products: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    assignedDriver: { id: string; name: string } | null;
    createdBy: { id: string; name: string };
    events: ShipmentEvent[];
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ShipmentDetail({ shipment }: ShipmentDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState<ShipmentStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validNextStatuses = VALID_TRANSITIONS[shipment.status] ?? [];

  function handleStatusChange(newStatus: ShipmentStatus) {
    setShowConfirm(newStatus);
    setNotes("");
    setError(null);
  }

  function confirmChange() {
    if (!showConfirm) return;
    startTransition(async () => {
      try {
        await updateShipmentStatus(shipment.id, showConfirm, notes || undefined);
        setShowConfirm(null);
        router.refresh();
      } catch (err: any) {
        setError(err.message ?? "Error al cambiar el estado.");
      }
    });
  }

  const trackingUrl = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/tracking/${shipment.trackingToken}`;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Back */}
        <Link
          href="/shipments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a envíos
        </Link>

        {/* Cabecera */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {shipment.recipientName}
              </h2>
              {shipment.orderNumber && (
                <p className="text-sm text-gray-400 mt-0.5">
                  #{shipment.orderNumber}
                </p>
              )}
            </div>
            <StatusBadge status={shipment.status} />
          </div>

          {/* Info */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2 text-gray-600">
              <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <p>{shipment.addressLine}</p>
                {shipment.addressExtra && (
                  <p className="text-gray-400">{shipment.addressExtra}</p>
                )}
                <p>
                  {shipment.city}, {shipment.province}
                  {shipment.postalCode ? ` (${shipment.postalCode})` : ""}
                </p>
              </div>
            </div>

            {shipment.recipientPhone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <a
                  href={`tel:${shipment.recipientPhone}`}
                  className="hover:text-blue-600"
                >
                  {shipment.recipientPhone}
                </a>
              </div>
            )}

            {shipment.products && (
              <div className="flex items-start gap-2 text-gray-600 sm:col-span-2">
                <Package className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                <p>{shipment.products}</p>
              </div>
            )}

            {shipment.assignedDriver && (
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <p>Chofer: {shipment.assignedDriver.name}</p>
              </div>
            )}
          </div>

          {/* Notas */}
          {shipment.notes && (
            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3 text-sm text-yellow-800">
              📝 {shipment.notes}
            </div>
          )}

          {/* Link de seguimiento */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xs text-gray-400">Link de seguimiento:</span>
            <a
              href={`/tracking/${shipment.trackingToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Ver página pública
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Cambio de estado */}
        {validNextStatuses.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Cambiar estado
            </h3>
            <div className="flex flex-wrap gap-2">
              {validNextStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className="px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-colors"
                >
                  → {STATUS_LABEL_MAP[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal de confirmación de cambio de estado */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-base font-semibold text-gray-900">
                Cambiar a "{STATUS_LABEL_MAP[showConfirm]}"
              </h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Motivo del cambio, observaciones..."
                  rows={3}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 h-10 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <Button
                  onClick={confirmChange}
                  disabled={isPending}
                  className="flex-1"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Confirmar"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Historial de eventos */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-5">
            Historial
          </h3>
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-100" />
            <div className="space-y-5">
              {shipment.events.map((ev) => (
                <div key={ev.id} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5 z-10">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {STATUS_LABEL_MAP[ev.toStatus]}
                      </p>
                      <p className="text-xs text-gray-400 shrink-0">
                        {new Date(ev.createdAt).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {ev.notes && (
                      <p className="text-sm text-gray-500 mt-0.5">{ev.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      por {ev.createdBy.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
