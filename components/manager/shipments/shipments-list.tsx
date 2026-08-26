"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Plus, Search, ChevronRight, FileUp, Printer, X, CheckCircle2, Loader2, Trash2, Minus, Copy, Check, Clock } from "lucide-react";
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
  trackingToken: string;
  products: string | null;
  source: string;
  createdAt: Date;
  saleDate: Date | null;
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

// ─── Helper: extrae SKUs del campo products ───────────────────────────────────

function extractSkus(products: string | null): string {
  if (!products) return "";
  const matches = [...products.matchAll(/\(SKU:\s*([^,)]+)(?:,\s*qty:\s*(\d+))?\)/gi)];
  if (matches.length > 0) {
    return matches.map((m) => {
      const sku = m[1].trim();
      const qty = m[2] ? parseInt(m[2], 10) : 1;
      return qty > 1 ? `${sku} ×${qty}` : sku;
    }).join(", ");
  }
  return "";
}

// ─── Helper: días transcurridos desde la compra ───────────────────────────────

interface DeadlineInfo {
  elapsed: number;
  label: string;
  className: string;
}

function getDeadlineInfo(createdAt: Date, saleDate: Date | null, status: ShipmentStatus): DeadlineInfo | null {
  // Para envíos finalizados no tiene sentido mostrar el plazo
  if (status === "ENTREGADO" || status === "CANCELADO") return null;

  // Usar la fecha de venta si está disponible; si no, la fecha de carga
  const reference = saleDate ?? createdAt;
  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsed = Math.floor((Date.now() - new Date(reference).getTime()) / msPerDay);

  // Sin badge si fue cargado hoy
  if (elapsed <= 0) return null;

  // 1–3 días transcurridos → verde
  if (elapsed <= 3) {
    return { elapsed, label: `${elapsed}d`, className: "text-green-700 bg-green-50 border-green-200" };
  }
  // 4–5 días → amarillo
  if (elapsed <= 5) {
    return { elapsed, label: `${elapsed}d`, className: "text-yellow-700 bg-yellow-50 border-yellow-200" };
  }
  // 6–7 días → rojo
  if (elapsed <= 7) {
    return { elapsed, label: `${elapsed}d`, className: "text-red-700 bg-red-50 border-red-300 font-semibold" };
  }
  // Más de 7 días → rojo fuerte
  return {
    elapsed,
    label: `${elapsed}d`,
    className: "text-red-700 bg-red-100 border-red-300 font-bold",
  };
}

function DeadlineBadge({ createdAt, saleDate, status }: { createdAt: Date; saleDate: Date | null; status: ShipmentStatus }) {
  const info = getDeadlineInfo(createdAt, saleDate, status);
  if (!info) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded border text-xs ${info.className}`}
      title={`${info.elapsed} días desde la ${saleDate ? "venta" : "carga"}`}
    >
      <Clock className="w-3 h-3 shrink-0" />
      {info.label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ShipmentsList({ shipments, currentStatus }: ShipmentsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCopy(e: React.MouseEvent, token: string, id: string) {
    e.stopPropagation();
    const url = `${window.location.origin}/tracking/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  const filtered = shipments.filter(
    (s) =>
      s.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      (s.orderNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Selección ─────────────────────────────────────────────────────────────

  function getCopies(id: string) {
    return copies[id] ?? 1;
  }

  function setCopiesFor(id: string, value: number) {
    setCopies((prev) => ({ ...prev, [id]: Math.max(1, Math.min(10, value)) }));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // inicializar copias en 1 si no existe
        setCopies((c) => ({ ...c, [id]: c[id] ?? 1 }));
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      const newIds = filtered.map((s) => s.id);
      setSelectedIds(new Set(newIds));
      setCopies((c) => {
        const next = { ...c };
        newIds.forEach((id) => { if (!next[id]) next[id] = 1; });
        return next;
      });
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleGenerateLabels() {
    const ids = Array.from(selectedIds);
    const qty = ids.map((id) => getCopies(id));
    router.push(`/shipments/labels?ids=${ids.join(",")}&qty=${qty.join(",")}`);
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
  const totalLabels = Array.from(selectedIds).reduce((sum, id) => sum + getCopies(id), 0);

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
            {/* Tabla desktop */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="pl-4 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Destinatario
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      SKU
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
                      Fecha · Plazo
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s) => {
                    const isSelected = selectedIds.has(s.id);
                    const skus = extractSkus(s.products);
                    const n = getCopies(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                        onClick={() => router.push(`/shipments/${s.id}`)}
                      >
                        {/* Checkbox + contador de copias */}
                        <td className="pl-3 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(s.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                            />
                            {isSelected && (
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => setCopiesFor(s.id, n - 1)}
                                  disabled={n <= 1}
                                  className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-semibold text-blue-700 w-4 text-center">{n}</span>
                                <button
                                  onClick={() => setCopiesFor(s.id, n + 1)}
                                  disabled={n >= 10}
                                  className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{s.recipientName}</p>
                          {s.orderNumber && (
                            <p className="text-xs text-gray-400">#{s.orderNumber}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {skus ? (
                            <p className="text-xs text-gray-500 font-mono">{skus}</p>
                          ) : (
                            <span className="text-gray-300">—</span>
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
                        {/* Fecha + plazo */}
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-400">
                            {new Date(s.createdAt).toLocaleDateString("es-AR")}
                          </p>
                          <DeadlineBadge createdAt={s.createdAt} saleDate={s.saleDate} status={s.status} />
                        </td>
                        <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleCopy(e, s.trackingToken, s.id)}
                            title="Copiar link de seguimiento"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            {copiedId === s.id
                              ? <Check className="w-3.5 h-3.5 text-green-500" />
                              : <Copy className="w-3.5 h-3.5" />
                            }
                          </button>
                        </td>
                        <td className="pr-3 py-3">
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
                const n = getCopies(s.id);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 bg-white border rounded-xl p-4 transition-colors ${
                      isSelected ? "border-blue-300 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(s.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {isSelected && (
                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setCopiesFor(s.id, n - 1)} disabled={n <= 1} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-200 disabled:opacity-30">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-blue-700 w-4 text-center">{n}</span>
                          <button onClick={() => setCopiesFor(s.id, n + 1)} disabled={n >= 10} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-200 disabled:opacity-30">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <Link href={`/shipments/${s.id}`} className="flex items-center justify-between flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{s.recipientName}</p>
                        <p className="text-xs text-gray-500 truncate">{s.addressLine}, {s.city}</p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <StatusBadge status={s.status} />
                          <DeadlineBadge createdAt={s.createdAt} saleDate={s.saleDate} status={s.status} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => handleCopy(e, s.trackingToken, s.id)}
                          title="Copiar link de seguimiento"
                          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          {copiedId === s.id
                            ? <Check className="w-3.5 h-3.5 text-green-500" />
                            : <Copy className="w-3.5 h-3.5" />
                          }
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
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
            <button onClick={clearSelection} className="text-gray-400 hover:text-gray-600 transition-colors" title="Cancelar selección">
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {selectedIds.size === 1 ? "1 envío" : `${selectedIds.size} envíos`}
              {totalLabels !== selectedIds.size && (
                <span className="text-gray-400 font-normal ml-1">· {totalLabels} etiquetas</span>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const n = selectedIds.size;
                if (!confirm(`¿Eliminar ${n} envío${n > 1 ? "s" : ""}? Esta acción no se puede deshacer.`)) return;
                startTransition(async () => {
                  await deleteShipments(Array.from(selectedIds));
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
                  await markAsReady(Array.from(selectedIds));
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
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
