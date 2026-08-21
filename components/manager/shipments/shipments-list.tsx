"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Plus, Search, ChevronRight, FileUp, Printer, X, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { ShipmentStatus } from "@prisma/client";
import { markAsReady } from "@/lib/actions/labels";
import { deleteShipments } from "@/lib/actions/shipments";

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
  products: string | null;
  createdAt: Date;
  assignedDriver: { id: string; name: string } | null;
  _count: { events: number };
}

// Extrae solo los códigos SKU del campo products ("Nombre (SKU: CODIGO)")
function extractSkus(products: string | null): string {
  if (!products) return "";
  const matches = products.match(/\(SKU:\s*([^)]+)\)/g) ?? [];
  if (matches.length > 0) {
    const skus = matches.map((m) => m.replace(/\(SKU:\s*/, "").replace(/\)$/, "").trim());
    return [...new Set(skus)].join(", ");
  }
  const skuLike = products.match(/\b[A-Z]{2,}-[A-Z0-9_-]+\b/g) ?? [];
  return [...new Set(skuLike)].join(", ");
}

// ─── Retraso ──────────────────────────────────────────────────────────────────

const FINAL_STATUSES: ShipmentStatus[] = [ShipmentStatus.ENTREGADO, ShipmentStatus.CANCELADO];

function daysSince(date: Date): number {
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function DelayBadge({ createdAt, status }: { createdAt: Date; status: ShipmentStatus }) {
  if (FINAL_STATUSES.includes(status)) return <span className="text-gray-300">—</span>;
  const days = daysSince(createdAt);
  if (days === 0) return <span className="text-gray-400 text-xs">Hoy</span>;
  const label = days === 1 ? "1 día" : `${days} días`;
  if (days <= 1) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{label}</span>;
  }
  if (days <= 3) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{label}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{label}</span>;
}

// ─── Selector de cantidad ─────────────────────────────────────────────────────

function QtyControl({
  count,
  onIncrement,
  onDecrement,
}: {
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded border border-gray-200 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onDecrement}
        className="px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 leading-none select-none"
      >
        −
      </button>
      <span className="px-1.5 text-xs font-semibold text-gray-700 min-w-[20px] text-center select-none">
        {count}
      </span>
      <button
        onClick={onIncrement}
        className="px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 leading-none select-none"
      >
        +
      </button>
    </div>
  );
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
  // Map<id, cantidad de etiquetas>  — cantidad mínima 1
  const [selectedCounts, setSelectedCounts] = useState<Map<string, number>>(new Map());
  const [isPending, startTransition] = useTransition();

  const filtered = shipments.filter(
    (s) =>
      s.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      (s.orderNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Helpers de selección ───────────────────────────────────────────────────

  function isSelected(id: string) {
    return selectedCounts.has(id);
  }

  function getCount(id: string) {
    return selectedCounts.get(id) ?? 1;
  }

  function toggleSelect(id: string) {
    setSelectedCounts((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 1);
      return next;
    });
  }

  function setCount(id: string, count: number) {
    setSelectedCounts((prev) => {
      const next = new Map(prev);
      if (count <= 0) next.delete(id);  // deselecciona si llega a 0
      else next.set(id, count);
      return next;
    });
  }

  function toggleAll() {
    if (selectedCounts.size === filtered.length) {
      setSelectedCounts(new Map());
    } else {
      // Preserva cantidades ya configuradas; nuevos entran con 1
      setSelectedCounts(new Map(filtered.map((s) => [s.id, selectedCounts.get(s.id) ?? 1])));
    }
  }

  function clearSelection() {
    setSelectedCounts(new Map());
  }

  // Total de etiquetas a imprimir (suma de todas las cantidades)
  const totalLabels = Array.from(selectedCounts.values()).reduce((sum, n) => sum + n, 0);
  const allSelected = filtered.length > 0 && selectedCounts.size === filtered.length;
  const someSelected = selectedCounts.size > 0 && selectedCounts.size < filtered.length;

  // ── Navegación ─────────────────────────────────────────────────────────────

  function handleGenerateLabels() {
    const uniqueIds = Array.from(selectedCounts.keys());
    const idsParam = Array.from(selectedCounts.entries())
      .map(([id, qty]) => `${id}:${qty}`)
      .join(",");

    // Cambiar a LISTO_PARA_ENVIAR inmediatamente al generar las etiquetas
    startTransition(async () => {
      await markAsReady(uniqueIds);
      router.push(`/shipments/labels?ids=${idsParam}`);
    });
  }

  function handleTabChange(value: string) {
    setSelectedCounts(new Map());
    const params = new URLSearchParams();
    if (value !== "ALL") params.set("status", value);
    router.push(`/shipments?${params.toString()}`);
  }

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
                <Link href="/shipments/upload" className="text-sm text-blue-600 hover:underline font-medium">
                  Subir PDF →
                </Link>
                <Link href="/shipments/new" className="text-sm text-gray-500 hover:underline">
                  Carga manual
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Tabla desktop ── */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="pl-4 pr-2 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    {/* Columna de cantidad — solo visible cuando hay selección */}
                    <th className={`py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide transition-all ${selectedCounts.size > 0 ? "w-24 px-2" : "w-0 overflow-hidden p-0"}`}>
                      {selectedCounts.size > 0 && "Etiquetas"}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Destinatario</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dirección</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Retraso</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Chofer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s) => {
                    const selected = isSelected(s.id);
                    const count = getCount(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors cursor-pointer ${selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                        onClick={() => router.push(`/shipments/${s.id}`)}
                      >
                        {/* Checkbox */}
                        <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(s.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Control de cantidad — solo visible cuando la fila está seleccionada */}
                        <td
                          className={`py-3 transition-all ${selectedCounts.size > 0 ? "w-24 px-2" : "w-0 overflow-hidden p-0"}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {selected && (
                            <QtyControl
                              count={count}
                              onIncrement={() => setCount(s.id, count + 1)}
                              onDecrement={() => setCount(s.id, count - 1)}
                            />
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{s.recipientName}</p>
                          {s.orderNumber && <p className="text-xs text-gray-400">#{s.orderNumber}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {extractSkus(s.products) ? (
                            <p className="text-xs font-mono text-gray-600 max-w-[160px] leading-relaxed">
                              {extractSkus(s.products)}
                            </p>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <p>{s.addressLine}</p>
                          <p className="text-xs text-gray-400">{s.city}, {s.province}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3"><DelayBadge createdAt={s.createdAt} status={s.status} /></td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Tarjetas mobile ── */}
            <div className="md:hidden space-y-2">
              {filtered.map((s) => {
                const selected = isSelected(s.id);
                const count = getCount(s.id);
                return (
                  <div
                    key={s.id}
                    className={`flex items-start gap-3 bg-white border rounded-xl p-4 transition-colors ${
                      selected ? "border-blue-300 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    {/* Checkbox + cantidad mobile */}
                    <div className="flex flex-col items-center gap-2 pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(s.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      {selected && (
                        <QtyControl
                          count={count}
                          onIncrement={() => setCount(s.id, count + 1)}
                          onDecrement={() => setCount(s.id, count - 1)}
                        />
                      )}
                    </div>

                    <Link href={`/shipments/${s.id}`} className="flex items-center justify-between flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{s.recipientName}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {s.addressLine}, {s.city}
                        </p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <StatusBadge status={s.status} />
                          <DelayBadge createdAt={s.createdAt} status={s.status} />
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
      {selectedCounts.size > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Cancelar selección"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <span className="text-sm font-medium text-gray-900">
                {selectedCounts.size === 1 ? "1 envío" : `${selectedCounts.size} envíos`}
              </span>
              {totalLabels !== selectedCounts.size && (
                <span className="text-sm text-blue-600 font-semibold ml-1.5">
                  · {totalLabels} etiquetas
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const n = selectedCounts.size;
                if (!confirm(`¿Eliminar ${n} envío${n > 1 ? "s" : ""}? Esta acción no se puede deshacer.`)) return;
                startTransition(async () => {
                  await deleteShipments(Array.from(selectedCounts.keys()));
                  clearSelection();
                  router.refresh();
                });
              }}
              disabled={isPending}
              className="flex items-center gap-2 bg-white border border-red-200 text-red-600 text-sm font-medium px-4 h-9 rounded-md hover:bg-red-50 disabled:opacity-60 transition-colors"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Eliminar
            </button>
            <button
              onClick={() => {
                startTransition(async () => {
                  await markAsReady(Array.from(selectedCounts.keys()));
                  clearSelection();
                  router.refresh();
                });
              }}
              disabled={isPending}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 h-9 rounded-md hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Listo para enviar
            </button>
            <button
              onClick={handleGenerateLabels}
              disabled={isPending}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 h-9 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Generar etiquetas
              {totalLabels > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                  {totalLabels}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
