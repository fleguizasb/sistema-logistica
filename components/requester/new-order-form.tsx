"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createShipmentAsRequester } from "@/lib/actions/requester";
import { Loader2, X, Plus, ChevronDown, ChevronUp, Search } from "lucide-react";

// ─── Catálogo de productos ───────────────────────────────────────────────────
const PRODUCT_CATALOG: { sku: string; group: string }[] = [
  { sku: "ASB-BOU070050", group: "ASB" },
  { sku: "ASB-BOU070050P", group: "ASB" },
  { sku: "ASB-CER060040", group: "ASB" },
  { sku: "ASB-CER060040P", group: "ASB" },
  { sku: "ASB-HOT070050", group: "ASB" },
  { sku: "ASB-HOT070050P", group: "ASB" },
  { sku: "ASB-SMA061040", group: "ASB" },
  { sku: "ASB-SMA061040P", group: "ASB" },
  { sku: "BSB-FLX080190", group: "BSB" },
  { sku: "BSB-FLX140190", group: "BSB" },
  { sku: "BSB-NOR080190", group: "BSB" },
  { sku: "BSB-NOR100200", group: "BSB" },
  { sku: "BSB-NOR140190", group: "BSB" },
  { sku: "BSB-NOR160200", group: "BSB" },
  { sku: "BSB-NOR200200", group: "BSB" },
  { sku: "BSB-UNI100200", group: "BSB" },
  { sku: "BSB-UNI140190", group: "BSB" },
  { sku: "BSB-UNI160200", group: "BSB" },
  { sku: "CCA-COM140190", group: "CCA" },
  { sku: "CPI-CBX140190", group: "CPI" },
  { sku: "CSB-BAL080190", group: "CSB" },
  { sku: "CSB-BAL090190", group: "CSB" },
  { sku: "CSB-BAL100190", group: "CSB" },
  { sku: "CSB-BAL140190", group: "CSB" },
  { sku: "CSB-BAL160200", group: "CSB" },
  { sku: "CSB-BAL180200", group: "CSB" },
  { sku: "CSB-BLK140190", group: "CSB" },
  { sku: "CSB-BLK160200", group: "CSB" },
  { sku: "CSB-BLK200200", group: "CSB" },
  { sku: "CSB-BPL080190", group: "CSB" },
  { sku: "CSB-BPL100200", group: "CSB" },
  { sku: "CSB-BPL140190", group: "CSB" },
  { sku: "CSB-BPL160200", group: "CSB" },
  { sku: "CSB-BPL200200", group: "CSB" },
  { sku: "CSB-CPL080190", group: "CSB" },
  { sku: "CSB-CPL100200", group: "CSB" },
  { sku: "CSB-CPL140190", group: "CSB" },
  { sku: "CSB-CPL160200", group: "CSB" },
  { sku: "CSB-CPL200200", group: "CSB" },
  { sku: "CSB-H22080190", group: "CSB" },
  { sku: "CSB-H22100190", group: "CSB" },
  { sku: "CSB-H22140190", group: "CSB" },
  { sku: "CSB-H22160200", group: "CSB" },
  { sku: "CSB-HYB140190", group: "CSB" },
  { sku: "CSB-HYB160200", group: "CSB" },
  { sku: "CSB-HYB200200", group: "CSB" },
  { sku: "CSB-ONE080190", group: "CSB" },
  { sku: "CSB-ONE140190", group: "CSB" },
  { sku: "ESB-CUA230240-BE", group: "ESB" },
  { sku: "ESB-CUA230240-GC", group: "ESB" },
  { sku: "ESB-CUA260280-BE", group: "ESB" },
  { sku: "ESB-CUA260280-GC", group: "ESB" },
  { sku: "ESB-PLU160230-BL", group: "ESB" },
  { sku: "ESB-PLU230240-BL", group: "ESB" },
  { sku: "ESB-PLU260280-BL", group: "ESB" },
  { sku: "ESB-PTO230240-BE", group: "ESB" },
  { sku: "ESB-PTO230240-GC", group: "ESB" },
  { sku: "ESB-PTO260280-AL", group: "ESB" },
  { sku: "FSB-CPL080190", group: "FSB" },
  { sku: "FSB-CPL140190", group: "FSB" },
  { sku: "FSB-HYB160200", group: "FSB" },
  { sku: "JSB-BLK140190NOR", group: "JSB" },
  { sku: "JSB-BLK140190UNI", group: "JSB" },
  { sku: "JSB-BLK160200NOR", group: "JSB" },
  { sku: "JSB-BLK160200UNI", group: "JSB" },
  { sku: "JSB-BLK200200NOR", group: "JSB" },
  { sku: "JSB-BPL080190NOR", group: "JSB" },
  { sku: "JSB-BPL080190UNI", group: "JSB" },
  { sku: "JSB-BPL100200UNI", group: "JSB" },
  { sku: "JSB-BPL140190NOR", group: "JSB" },
  { sku: "JSB-BPL140190UNI", group: "JSB" },
  { sku: "JSB-BPL160200NOR", group: "JSB" },
  { sku: "JSB-BPL160200UNI", group: "JSB" },
  { sku: "JSB-CPL100200NOR", group: "JSB" },
  { sku: "JSB-CPL100200UNI", group: "JSB" },
  { sku: "JSB-CPL140190NOR", group: "JSB" },
  { sku: "JSB-CPL140190UNI", group: "JSB" },
  { sku: "JSB-CPL160200UNI", group: "JSB" },
  { sku: "JSB-CPL200200NOR", group: "JSB" },
  { sku: "JSB-HYB140190UNI", group: "JSB" },
  { sku: "JSB-HYB160200NOR", group: "JSB" },
  { sku: "JSB-HYB160200UNI", group: "JSB" },
  { sku: "JSB-ONE140190UNI", group: "JSB" },
  { sku: "PSB-LUX100200", group: "PSB" },
  { sku: "PSB-LUX140190", group: "PSB" },
  { sku: "PSB-LUX160200", group: "PSB" },
  { sku: "PSB-LUX200200", group: "PSB" },
  { sku: "SSB-144FULL-BL-L", group: "SSB" },
  { sku: "SSB-144KING-BL-L", group: "SSB" },
  { sku: "SSB-144QUEEN-BL-L", group: "SSB" },
  { sku: "SSB-144TWIN-BL-L", group: "SSB" },
  { sku: "SSB-200FULL-BE-L", group: "SSB" },
  { sku: "SSB-200FULL-BL-L", group: "SSB" },
  { sku: "SSB-200FULL-GR-L", group: "SSB" },
  { sku: "SSB-200KING-BE-L", group: "SSB" },
  { sku: "SSB-200KING-BL-L", group: "SSB" },
  { sku: "SSB-200QUEEN-GR-L", group: "SSB" },
  { sku: "SSB-400FULL-BL-L", group: "SSB" },
  { sku: "SSB-400TWIN-BL-L", group: "SSB" },
  { sku: "TCH-520-BL", group: "TCH" },
  { sku: "TDA-500-BL", group: "TDA" },
  { sku: "TDA-600-BL", group: "TDA" },
];

const ALL_GROUPS = Array.from(new Set(PRODUCT_CATALOG.map((p) => p.group)));
// ────────────────────────────────────────────────────────────────────────────

interface LogisticsCompany {
  id: string;
  name: string;
  isInternal: boolean;
}

interface Props {
  userId: string;
  companies: LogisticsCompany[];
}

export default function NewOrderForm({ userId, companies }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Logística
  const [logisticsCompanyId, setLogisticsCompanyId] = useState<string>("");

  // Picker de productos
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>(ALL_GROUPS[0]);
  const [search, setSearch] = useState("");
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [customProduct, setCustomProduct] = useState("");
  const [customProducts, setCustomProducts] = useState<string[]>([]);

  // Filtrar catálogo
  const filteredItems = useMemo(() => {
    if (search.trim()) {
      return PRODUCT_CATALOG.filter((p) =>
        p.sku.toLowerCase().includes(search.toLowerCase())
      );
    }
    return PRODUCT_CATALOG.filter((p) => p.group === activeGroup);
  }, [search, activeGroup]);

  function toggleSku(sku: string) {
    setSelectedSkus((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    );
  }

  function addCustomProduct() {
    const trimmed = customProduct.trim();
    if (!trimmed) return;
    setCustomProducts((prev) => [...prev, trimmed]);
    setCustomProduct("");
  }

  function removeCustomProduct(idx: number) {
    setCustomProducts((prev) => prev.filter((_, i) => i !== idx));
  }

  function buildProductsString(): string {
    return [...selectedSkus, ...customProducts].join(", ");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const data = {
      orderNumber: fd.get("orderNumber") as string,
      recipientName: fd.get("recipientName") as string,
      recipientPhone: fd.get("recipientPhone") as string,
      addressLine: fd.get("addressLine") as string,
      addressExtra: fd.get("addressExtra") as string,
      city: fd.get("city") as string,
      province: fd.get("province") as string,
      postalCode: fd.get("postalCode") as string,
      products: buildProductsString(),
      notes: fd.get("notes") as string,
      logisticsCompanyId: logisticsCompanyId || undefined,
    };

    startTransition(async () => {
      try {
        await createShipmentAsRequester(data);
        router.push("/orders");
      } catch (err: any) {
        setError(err.message ?? "Error al crear el pedido");
      }
    });
  }

  const internalCompanies = companies.filter((c) => c.isInternal);
  const externalCompanies = companies.filter((c) => !c.isInternal);
  const totalSelected = selectedSkus.length + customProducts.length;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border p-6 space-y-5"
    >
      {/* Número de pedido */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Número de pedido / orden
        </label>
        <input
          name="orderNumber"
          type="text"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ej. 12345"
        />
      </div>

      {/* Destinatario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del destinatario <span className="text-red-500">*</span>
          </label>
          <input
            name="recipientName"
            type="text"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre y apellido"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            name="recipientPhone"
            type="tel"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="11 1234-5678"
          />
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dirección <span className="text-red-500">*</span>
        </label>
        <input
          name="addressLine"
          type="text"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Calle y número"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Piso / Dpto / Referencia
        </label>
        <input
          name="addressExtra"
          type="text"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ej. 2° B"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ciudad <span className="text-red-500">*</span>
          </label>
          <input
            name="city"
            type="text"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ej. Buenos Aires"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provincia <span className="text-red-500">*</span>
          </label>
          <input
            name="province"
            type="text"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ej. CABA"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código postal
          </label>
          <input
            name="postalCode"
            type="text"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ej. 1001"
          />
        </div>
      </div>

      {/* ── Picker de productos ───────────────────────────────────────────── */}
      <div className="border rounded-xl overflow-hidden">
        {/* Header */}
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <span className="text-sm font-medium text-gray-700">
            Productos del pedido
            {totalSelected > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {totalSelected}
              </span>
            )}
          </span>
          {pickerOpen ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </button>

        {pickerOpen && (
          <div className="border-t">
            {/* Buscador */}
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar SKU..."
                  className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tabs de familias — solo si no hay búsqueda */}
            {!search.trim() && (
              <div className="px-4 pb-2 flex gap-1 flex-wrap">
                {ALL_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setActiveGroup(g)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      activeGroup === g
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            {/* Lista de SKUs */}
            <div className="px-4 pb-3 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">Sin resultados</p>
              ) : (
                filteredItems.map((p) => {
                  const selected = selectedSkus.includes(p.sku);
                  return (
                    <button
                      key={p.sku}
                      type="button"
                      onClick={() => toggleSku(p.sku)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                        selected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                      }`}
                    >
                      {p.sku}
                    </button>
                  );
                })
              )}
            </div>

            {/* Agregar manual */}
            <div className="px-4 py-3 border-t bg-gray-50">
              <p className="text-xs text-gray-500 mb-2">O agregá un producto manualmente:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customProduct}
                  onChange={(e) => setCustomProduct(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomProduct();
                    }
                  }}
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ej. Camiseta talle M"
                />
                <button
                  type="button"
                  onClick={addCustomProduct}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
                >
                  <Plus size={13} />
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chips de seleccionados */}
        {totalSelected > 0 && (
          <div className="px-4 py-3 border-t flex flex-wrap gap-2">
            {selectedSkus.map((sku) => (
              <span
                key={sku}
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-mono font-medium px-2.5 py-1 rounded-full"
              >
                {sku}
                <button
                  type="button"
                  onClick={() => toggleSku(sku)}
                  className="ml-0.5 hover:text-blue-900"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            {customProducts.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {p}
                <button
                  type="button"
                  onClick={() => removeCustomProduct(i)}
                  className="ml-0.5 hover:text-gray-900"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Logística ─────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Empresa logística
        </label>
        <select
          value={logisticsCompanyId}
          onChange={(e) => setLogisticsCompanyId(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Asignar automáticamente (recomendado)</option>
          {internalCompanies.length > 0 && (
            <optgroup label="Flota propia">
              {internalCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
          {externalCompanies.length > 0 && (
            <optgroup label="Logísticas externas">
              {externalCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Se asigna automáticamente según código postal y productos. Podés sobreescribirlo.
        </p>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observaciones
        </label>
        <textarea
          name="notes"
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Instrucciones especiales, horario de entrega..."
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          {isPending && <Loader2 size={15} className="animate-spin" />}
          Crear pedido
        </button>
        <a
          href="/orders"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
