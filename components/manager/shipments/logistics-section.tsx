"use client";

import { useState, useTransition } from "react";
import { assignLogisticsToShipment } from "@/lib/actions/logistics";
import { Loader2, ExternalLink, Truck, PackageCheck } from "lucide-react";
import { toast } from "@/lib/toast";

interface LogisticsCompany {
  id: string;
  name: string;
  isInternal: boolean;
  trackingUrlTemplate: string | null;
}

interface Props {
  shipmentId: string;
  currentCompanyId: string | null;
  currentTrackingCode: string | null;
  currentTrackingUrl: string | null;
  companies: LogisticsCompany[];
}

export default function LogisticsSection({
  shipmentId,
  currentCompanyId,
  currentTrackingCode,
  currentTrackingUrl,
  companies,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [companyId, setCompanyId] = useState(currentCompanyId ?? "");
  const [trackingCode, setTrackingCode] = useState(currentTrackingCode ?? "");
  const [trackingUrl, setTrackingUrl] = useState(currentTrackingUrl ?? "");

  const selectedCompany = companies.find((c) => c.id === companyId);
  const isExternal = selectedCompany && !selectedCompany.isInternal;

  // Auto-generar URL desde template cuando cambia el código
  function handleCodeChange(code: string) {
    setTrackingCode(code);
    if (selectedCompany?.trackingUrlTemplate && code.trim()) {
      const autoUrl = selectedCompany.trackingUrlTemplate.replace("{code}", code.trim());
      setTrackingUrl(autoUrl);
    } else if (!currentTrackingUrl) {
      setTrackingUrl("");
    }
  }

  // Al cambiar empresa, limpiar URL auto si había
  function handleCompanyChange(id: string) {
    setCompanyId(id);
    const company = companies.find((c) => c.id === id);
    if (company?.trackingUrlTemplate && trackingCode.trim()) {
      setTrackingUrl(company.trackingUrlTemplate.replace("{code}", trackingCode.trim()));
    }
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await assignLogisticsToShipment(shipmentId, {
          logisticsCompanyId: companyId || null,
          externalTrackingCode: trackingCode || undefined,
          externalTrackingUrl: trackingUrl || undefined,
        });
        toast.success("Logística actualizada");
      } catch (err: any) {
        toast.error(err.message ?? "Error al guardar");
      }
    });
  }

  return (
    <div className="bg-white border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Truck size={18} className="text-gray-400" />
        <h3 className="font-semibold text-gray-900">Logística</h3>
      </div>

      {/* Selector de empresa */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Empresa logística
        </label>
        <select
          value={companyId}
          onChange={(e) => handleCompanyChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sin asignar</option>
          <optgroup label="Flota propia">
            {companies
              .filter((c) => c.isInternal)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="Logísticas externas">
            {companies
              .filter((c) => !c.isInternal)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </optgroup>
        </select>
      </div>

      {/* Tracking externo — solo si es empresa externa */}
      {isExternal && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <PackageCheck size={13} />
            Pegá el código de seguimiento que te da{" "}
            <strong>{selectedCompany.name}</strong>
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código de seguimiento
            </label>
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ej. EP123456789AR"
            />
            {selectedCompany.trackingUrlTemplate && (
              <p className="text-xs text-gray-400 mt-1">
                La URL se generará automáticamente desde el código.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link de seguimiento
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-3 border rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors"
                  title="Abrir link"
                >
                  <ExternalLink size={15} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guardar */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          Guardar
        </button>

        {currentTrackingUrl && (
          <a
            href={currentTrackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-purple-600 hover:underline"
          >
            <ExternalLink size={13} />
            Ver tracking externo
          </a>
        )}
      </div>
    </div>
  );
}
