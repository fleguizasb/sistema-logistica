"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Plus, Search, ChevronRight, FileUp, Printer, X, CheckCircle2, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { ShipmentStatus } from "@prisma/client";
import { markAsReady } from "@/lib/actions/labels";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const filtered = shipments.filter(
    (s) =>
      s.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      (s.orderNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Selección ─────────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleGenerateLabels() {
    const ids = Array.from(selectedIds).join(",");
    router.push(`/shipments/labels?ids=${ids}`);
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  function handleTabChange(value: string) {
    setSelectedIds(new Set());
    const params = new URLSearchParams();
    if (value !== "ALL") params.set("status", value);
    router.push(`/shipments?${params.toString()}`);
  }

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filtered.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Barra superior */}
      <div className="p-6 pb-0 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar destinatario, ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-md border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 shrink-0">
            <Link
              href="/shipments/upload"
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-3 h-9 rounded-md hover:bg-gray-50 transition-colors"
            >
              <FileUp className="w-4 h-4" />
              <span className="hidden sm:inline">Subir PDF</span>
            </Link>
            <Link
              href="/shipments/new"
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 h-9 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </Link>
          </div>
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
      <div className="flex-1 overflow-auto p-6 pt-4 pb-20">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">
              No hay envíos{search ? " que coincidan" : ""} en esta categoría.
            </p>
            {!search && (
              <div className="flex gap-3 mt-4">
                <Link
                  href="/shipments/upload"
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Subir PDF →
                </Link>
                <Link
                  href="/shipments/new"
                  className="text-sm text-gray-500 hover:underline"
                >
                  Carga manual
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tabla desktop */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {/* Checkbox "select all" */}
                    <th className="pl-4 pr-2 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Destinatario
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Dirección
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Estado
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Chofer
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Fecha
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s) => {
                    const isSelected = selectedIds.has(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                        onClick={() => router.push(`/shipments/${s.id}`)}
                      >
                        {/* Checkbox individual */}
                        <td className="pl-4 pr-2 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(s.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{s.recipientName}</p>
                          {s.orderNumber && (
                            <p className="text-xs text-gray-400">#{s.orderNumber}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <p>{s.addressLine}</p>
                          <p className="text-xs text-gray-400">
                            {s.city}, {s.province}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.assignedDriver?.name ?? (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(s.createdAt).toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas mobile */}
            <div className="md:hidden space-y-2">
              {filtered.map((s) => {
                const isSelected = selectedIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 bg-white border rounded-xl p-4 transition-colors ${
                      isSelected ? "border-blue-300 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    {/* Checkbox mobile */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(s.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Link
                      href={`/shipments/${s.id}`}
                      className="flex items-center justify-between flex-1 min-w-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {s.recipientName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {s.addressLine}, {s.city}
                        </p>
                        <div className="mt-2">
                          <StatusBadge status={s.status} />
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 ml-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Barra flotante de selección ── */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Cancelar selección"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {selectedIds.size === 1
                ? "1 envío seleccionado"
                : `${selectedIds.size} envíos seleccionados`}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                startTransition(async () => {
                  await markAsReady(Array.from(selectedIds));
                  clearSelection();
                  router.refresh();
                });
              }}
              disabled={isPending}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 h-9 rounded-md hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Listo para enviar
            </button>
            <button
              onClick={handleGenerateLabels}
              disabled={isPending}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 h-9 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Generar etiquetas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
