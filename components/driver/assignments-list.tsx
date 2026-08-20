"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Package,
  Phone,
  ChevronRight,
  Navigation,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { ShipmentStatus } from "@prisma/client";
import { StatusBadge } from "@/components/ui/badge";
import { startRoute } from "@/lib/actions/driver";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Shipment {
  id: string;
  status: ShipmentStatus;
  recipientName: string;
  addressLine: string;
  addressExtra: string | null;
  city: string;
  province: string;
  orderNumber: string | null;
  products: string | null;
  notes: string | null;
  recipientPhone: string | null;
}

interface AssignmentsListProps {
  shipments: Shipment[];
}

// ── Componente principal ───────────────────────────────────────────────────────

export function AssignmentsList({ shipments }: AssignmentsListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const listos = shipments.filter((s) => s.status === ShipmentStatus.LISTO_PARA_ENVIAR);
  const enCamino = shipments.filter((s) => s.status === ShipmentStatus.EN_CAMINO);

  // Sólo los LISTO_PARA_ENVIAR son seleccionables
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(listos.map((s) => s.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleStartRoute() {
    setError(null);
    startTransition(async () => {
      const result = await startRoute(Array.from(selectedIds));
      if (!result.success) {
        setError(result.error ?? "Error al iniciar el recorrido");
        return;
      }
      clearSelection();
      router.refresh();
      // Abrir Google Maps en la misma pestaña (mobile)
      if (result.mapsUrl) {
        window.open(result.mapsUrl, "_blank");
      }
    });
  }

  if (shipments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-700">No hay pedidos disponibles</p>
        <p className="text-xs text-gray-500 mt-1">
          Cuando haya envíos listos para retirar, aparecerán acá.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Pedidos de hoy</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {listos.length > 0 && `${listos.length} listo${listos.length > 1 ? "s" : ""} para retirar`}
              {listos.length > 0 && enCamino.length > 0 && " · "}
              {enCamino.length > 0 && `${enCamino.length} en camino`}
            </p>
          </div>
          {listos.length > 0 && selectedIds.size === 0 && (
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
            >
              Seleccionar todos
            </button>
          )}
        </div>

        {/* Error inline */}
        {error && (
          <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto px-4 pt-4 pb-32 space-y-6">
        {/* Sección: En camino */}
        {enCamino.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              En camino
            </h2>
            <div className="space-y-2">
              {enCamino.map((s) => (
                <ShipmentCard
                  key={s.id}
                  shipment={s}
                  selectable={false}
                  selected={false}
                  onToggle={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        {/* Sección: Listos para retirar */}
        {listos.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              Listos para retirar
            </h2>
            <div className="space-y-2">
              {listos.map((s) => (
                <ShipmentCard
                  key={s.id}
                  shipment={s}
                  selectable={true}
                  selected={selectedIds.has(s.id)}
                  onToggle={() => toggleSelect(s.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Barra flotante de selección */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-3 bg-white border-t border-gray-200 shadow-xl z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {selectedIds.size === 1
                  ? "1 pedido seleccionado"
                  : `${selectedIds.size} pedidos seleccionados`}
              </p>
            </div>
            <button
              onClick={handleStartRoute}
              disabled={isPending}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 h-10 rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors shrink-0"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              Iniciar recorrido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta individual ─────────────────────────────────────────────────────────

function ShipmentCard({
  shipment: s,
  selectable,
  selected,
  onToggle,
}: {
  shipment: Shipment;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border transition-all ${
        selected
          ? "border-blue-400 ring-1 ring-blue-400"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox (solo para LISTO_PARA_ENVIAR) */}
        {selectable ? (
          <button
            onClick={onToggle}
            className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              selected
                ? "bg-blue-600 border-blue-600"
                : "border-gray-300 bg-white"
            }`}
          >
            {selected && (
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        ) : (
          <div className="mt-0.5 w-6 h-6 shrink-0" />
        )}

        {/* Contenido */}
        <Link href={`/assignments/${s.id}`} className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{s.recipientName}</p>
              {s.orderNumber && (
                <p className="text-xs text-gray-400">#{s.orderNumber}</p>
              )}
            </div>
            <StatusBadge status={s.status} className="shrink-0" />
          </div>

          <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
            <span className="truncate">
              {s.addressLine}
              {s.addressExtra ? `, ${s.addressExtra}` : ""}
              {" · "}
              {s.city}
            </span>
          </div>

          {s.recipientPhone && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
              <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              {s.recipientPhone}
            </div>
          )}
        </Link>

        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
      </div>
    </div>
  );
}
