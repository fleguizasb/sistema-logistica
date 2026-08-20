"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Package, Plus, Search, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { STATUS_LABEL_MAP } from "@/lib/constants/shipment-status";
import { ShipmentStatus } from "@prisma/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Shipment {
  id: string;
  recipientName: string;
  addressLine: string;
  city: string;
  province: string;
  status: ShipmentStatus;
  orderNumber: string | null;
  source: string;
  createdAt: Date;
  assignedDriver: { id: string; name: string } | null;
  _count: { events: number };
}

interface ShipmentsListProps {
  shipments: Shipment[];
  currentStatus: string;
}

// ─── Tabs de filtro ───────────────────────────────────────────────────────────

const TABS: { value: string; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "EN_PREPARACION", label: "En preparación" },
  { value: "LISTO_PARA_ENVIAR", label: "Listos" },
  { value: "ASIGNADO_CHOFER", label: "Asignados" },
  { value: "EN_CAMINO", label: "En camino" },
  { value: "ENTREGADO", label: "Entregados" },
  { value: "INCIDENCIA", label: "Incidencias" },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export function ShipmentsList({ shipments, currentStatus }: ShipmentsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = shipments.filter(
    (s) =>
      s.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      (s.orderNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function handleTabChange(value: string) {
    const params = new URLSearchParams();
    if (value !== "ALL") params.set("status", value);
    router.push(`/shipments?${params.toString()}`);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Barra superior */}
      <div className="p-6 pb-0 space-y-4">
        <div className="flex items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar destinatario, ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-md border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botón nuevo */}
          <Link
            href="/shipments/new"
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 h-9 rounded-md hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nuevo envío
          </Link>
        </div>

        {/* Tabs de estado */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentStatus === tab.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto p-6 pt-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">No hay envíos{search ? " que coincidan" : ""} en esta categoría.</p>
            {!search && (
              <Link href="/shipments/new" className="mt-3 text-sm text-blue-600 hover:underline font-medium">
                Crear primer envío →
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Tabla (desktop) */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Destinatario</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dirección</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Chofer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/shipments/${s.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{s.recipientName}</p>
                        {s.orderNumber && (
                          <p className="text-xs text-gray-400">#{s.orderNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{s.addressLine}</p>
                        <p className="text-xs text-gray-400">{s.city}, {s.province}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.assignedDriver?.name ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(s.createdAt).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas (mobile) */}
            <div className="md:hidden space-y-2">
              {filtered.map((s) => (
                <Link
                  key={s.id}
                  href={`/shipments/${s.id}`}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">{s.recipientName}</p>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{s.addressLine}, {s.city}</p>
                    <div className="mt-2">
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 ml-3" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
