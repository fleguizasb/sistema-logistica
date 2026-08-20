"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Package,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { ShipmentStatus, ShipmentSource } from "@prisma/client";
import { StatusBadge, STATUS_LABEL } from "@/components/ui/badge";
import { markDelivered, reportIncident } from "@/lib/actions/driver";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ShipmentEvent {
  toStatus: ShipmentStatus;
  notes: string | null;
  createdAt: Date;
  createdBy: { name: string };
}

interface Shipment {
  id: string;
  status: ShipmentStatus;
  recipientName: string;
  recipientPhone: string | null;
  addressLine: string;
  addressExtra: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  orderNumber: string | null;
  products: string | null;
  notes: string | null;
  source: ShipmentSource;
  events: ShipmentEvent[];
}

interface ShipmentDetailProps {
  shipment: Shipment;
  canOperate: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMapsLink(shipment: Shipment) {
  const address = [
    shipment.addressLine,
    shipment.city,
    shipment.province,
    "Argentina",
  ]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Componente principal ───────────────────────────────────────────────────────

export function ShipmentDetail({ shipment, canOperate }: ShipmentDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentNote, setIncidentNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleMarkDelivered() {
    setError(null);
    startTransition(async () => {
      const result = await markDelivered(shipment.id);
      if (!result.success) {
        setError(result.error ?? "Error al marcar como entregado");
        return;
      }
      router.push("/assignments");
      router.refresh();
    });
  }

  function handleReportIncident() {
    setError(null);
    startTransition(async () => {
      const result = await reportIncident(shipment.id, incidentNote);
      if (!result.success) {
        setError(result.error ?? "Error al reportar incidencia");
        return;
      }
      router.push("/assignments");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 sticky top-0 z-10">
        <Link
          href="/assignments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold text-gray-900 leading-tight">
              {shipment.recipientName}
            </h1>
            {shipment.orderNumber && (
              <p className="text-xs text-gray-400 mt-0.5">Orden #{shipment.orderNumber}</p>
            )}
          </div>
          <StatusBadge status={shipment.status} className="shrink-0" />
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto px-4 pt-4 pb-32 space-y-4">
        {/* Dirección */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Dirección de entrega
          </h2>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-900 font-medium">{shipment.addressLine}</p>
              {shipment.addressExtra && (
                <p className="text-xs text-gray-500">{shipment.addressExtra}</p>
              )}
              <p className="text-xs text-gray-500">
                {shipment.city}, {shipment.province}
                {shipment.postalCode ? ` (CP ${shipment.postalCode})` : ""}
              </p>
            </div>
          </div>
          <a
            href={buildMapsLink(shipment)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir en Google Maps
          </a>
        </div>

        {/* Contacto */}
        {shipment.recipientPhone && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Contacto
            </h2>
            <a
              href={`tel:${shipment.recipientPhone}`}
              className="flex items-center gap-3 text-sm text-blue-600 font-medium"
            >
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              {shipment.recipientPhone}
            </a>
          </div>
        )}

        {/* Productos */}
        {shipment.products && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Contenido del pedido
            </h2>
            <div className="flex items-start gap-3">
              <Package className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {shipment.products}
              </p>
            </div>
          </div>
        )}

        {/* Notas */}
        {shipment.notes && (
          <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-4">
            <h2 className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-2">
              Nota del cliente
            </h2>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">{shipment.notes}</p>
            </div>
          </div>
        )}

        {/* Historial de eventos */}
        {shipment.events.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Historial
            </h2>
            <div className="space-y-3">
              {shipment.events.map((event, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700">
                      {STATUS_LABEL[event.toStatus]}
                    </p>
                    {event.notes && (
                      <p className="text-xs text-gray-500 mt-0.5">{event.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatTime(event.createdAt)} · {event.createdBy.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Formulario de incidencia (expandible) */}
        {canOperate && showIncidentForm && (
          <div className="bg-white rounded-2xl border border-orange-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-orange-700">Reportar incidencia</h2>
            <textarea
              value={incidentNote}
              onChange={(e) => setIncidentNote(e.target.value)}
              placeholder="Describí qué pasó (ej: no había nadie en el domicilio, dirección incorrecta...)"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowIncidentForm(false);
                  setIncidentNote("");
                }}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportIncident}
                disabled={isPending || !incidentNote.trim()}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                Confirmar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botones de acción fijos (solo si puede operar) */}
      {canOperate && !showIncidentForm && (
        <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t border-gray-200 shadow-xl z-20 flex gap-3">
          <button
            onClick={() => setShowIncidentForm(true)}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-orange-300 text-orange-600 text-sm font-semibold hover:bg-orange-50 disabled:opacity-60 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Incidencia
          </button>
          <button
            onClick={handleMarkDelivered}
            disabled={isPending}
            className="flex-[2] flex items-center justify-center gap-2 h-12 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Marcar como entregado
          </button>
        </div>
      )}
    </div>
  );
}
