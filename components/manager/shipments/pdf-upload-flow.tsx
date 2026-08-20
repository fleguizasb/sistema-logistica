"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShipment } from "@/lib/actions/shipments";
import type { ExtractedShipment } from "@/lib/extractors/types";
import {
  Upload,
  FileText,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Step = "upload" | "review" | "saving" | "done";

// ─── Componente principal ─────────────────────────────────────────────────────

export function PdfUploadFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [source, setSource] = useState<string>("");
  const [shipments, setShipments] = useState<ExtractedShipment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Subir y procesar PDF ────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setUploadError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/pdf/extract", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.error ?? "Error al procesar el PDF.");
        setLoading(false);
        return;
      }

      setSource(json.source);
      setShipments(json.shipments);
      setStep("review");
    } catch {
      setUploadError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  // ── Actualizar campo de un envío ───────────────────────────────────────────

  function updateShipment(index: number, field: keyof ExtractedShipment, value: string) {
    setShipments((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  // ── Guardar todos los envíos ───────────────────────────────────────────────

  function handleSave() {
    setSaveError(null);
    setStep("saving");

    startTransition(async () => {
      let count = 0;
      for (const s of shipments) {
        try {
          await createShipment({
            recipientName: s.recipientName,
            recipientPhone: s.recipientPhone,
            addressLine: s.addressLine,
            addressExtra: s.addressExtra,
            city: s.city,
            province: s.province,
            postalCode: s.postalCode,
            products: s.products,
            notes: s.notes,
            orderNumber: s.orderNumber,
          });
          count++;
        } catch (err: any) {
          setSaveError(`Error en orden #${s.orderNumber ?? count + 1}: ${err.message}`);
          setStep("review");
          return;
        }
      }
      setSavedCount(count);
      setStep("done");
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Link
          href="/shipments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a envíos
        </Link>

        {/* ── Paso 1: Upload ── */}
        {step === "upload" && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Subir PDF</h2>
            <p className="text-sm text-gray-500">
              Aceptamos etiquetas de{" "}
              <span className="font-medium text-gray-700">Tienda Nube</span> y{" "}
              <span className="font-medium text-gray-700">Remitos de Contabilium</span>.
              Podés subir un PDF con múltiples órdenes.
            </p>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-sm text-gray-500">Procesando PDF...</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Upload className="w-7 h-7 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      Arrastrá el PDF aquí o hacé clic para seleccionarlo
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Solo archivos PDF</p>
                  </div>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleInputChange}
            />

            {uploadError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {uploadError}
              </div>
            )}
          </div>
        )}

        {/* ── Paso 2: Revisión ── */}
        {step === "review" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Revisá los datos extraídos
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {shipments.length === 1
                    ? "1 envío encontrado"
                    : `${shipments.length} envíos encontrados`}{" "}
                  en el PDF ·{" "}
                  <span className="font-medium text-gray-700">
                    {source === "TIENDANUBE" ? "Tienda Nube" : "Remito"}
                  </span>
                </p>
              </div>
              <button
                onClick={() => {
                  setStep("upload");
                  setShipments([]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-sm text-gray-500 hover:text-gray-900 underline"
              >
                Cambiar PDF
              </button>
            </div>

            <div className="space-y-4">
              {shipments.map((s, i) => (
                <ShipmentCard
                  key={i}
                  index={i}
                  shipment={s}
                  onChange={(field, value) => updateShipment(i, field, value)}
                />
              ))}
            </div>

            {saveError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {saveError}
              </div>
            )}

            <div className="flex gap-3 pb-6">
              <button
                onClick={() => setStep("upload")}
                className="flex-1 h-10 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <Button onClick={handleSave} className="flex-1">
                Guardar {shipments.length === 1 ? "envío" : `${shipments.length} envíos`}
              </Button>
            </div>
          </>
        )}

        {/* ── Paso 3: Guardando ── */}
        {step === "saving" && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-600">
              Guardando {shipments.length === 1 ? "el envío" : "los envíos"}...
            </p>
          </div>
        )}

        {/* ── Paso 4: Listo ── */}
        {step === "done" && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">
                {savedCount === 1
                  ? "¡Envío creado!"
                  : `¡${savedCount} envíos creados!`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Los podés ver en la lista de envíos.
              </p>
            </div>
            <Button onClick={() => router.push("/shipments")}>
              Ver envíos
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tarjeta de revisión de un envío ─────────────────────────────────────────

function ShipmentCard({
  index,
  shipment,
  onChange,
}: {
  index: number;
  shipment: ExtractedShipment;
  onChange: (field: keyof ExtractedShipment, value: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
            {index + 1}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">
              {shipment.recipientName || "Sin nombre"}
            </p>
            <p className="text-xs text-gray-400">
              {shipment.city || "—"}
              {shipment.orderNumber ? ` · Orden #${shipment.orderNumber}` : ""}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Campos editables */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Nombre completo *"
              value={shipment.recipientName}
              onChange={(v) => onChange("recipientName", v)}
            />
            <Field
              label="Teléfono"
              value={shipment.recipientPhone ?? ""}
              onChange={(v) => onChange("recipientPhone", v)}
            />
            <Field
              label="Calle y número *"
              value={shipment.addressLine}
              onChange={(v) => onChange("addressLine", v)}
              className="sm:col-span-2"
            />
            <Field
              label="Piso / depto / referencias"
              value={shipment.addressExtra ?? ""}
              onChange={(v) => onChange("addressExtra", v)}
              className="sm:col-span-2"
            />
            <Field
              label="Ciudad *"
              value={shipment.city}
              onChange={(v) => onChange("city", v)}
            />
            <Field
              label="Código postal"
              value={shipment.postalCode ?? ""}
              onChange={(v) => onChange("postalCode", v)}
            />
            <Field
              label="Provincia *"
              value={shipment.province}
              onChange={(v) => onChange("province", v)}
              className="sm:col-span-2"
            />
            <Field
              label="Productos"
              value={shipment.products ?? ""}
              onChange={(v) => onChange("products", v)}
              multiline
              className="sm:col-span-2"
            />
            {(shipment.notes ?? "") !== "" && (
              <Field
                label="Notas del cliente"
                value={shipment.notes ?? ""}
                onChange={(v) => onChange("notes", v)}
                multiline
                className="sm:col-span-2"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Campo de formulario editable ────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  multiline,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-gray-200 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}
