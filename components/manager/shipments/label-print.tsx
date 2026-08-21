"use client";

import { useState, useTransition } from "react";
import { confirmLabels } from "@/lib/actions/labels";
import { Printer, CheckCircle2, ArrowLeft, Loader2, Plus, Minus } from "lucide-react";
import Link from "next/link";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ShipmentForLabel {
  id: string;
  recipientName: string;
  recipientPhone: string | null;
  addressLine: string;
  addressExtra: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  orderNumber: string | null;
  trackingToken: string;
  products: string | null;
}

interface LabelPrintProps {
  shipments: ShipmentForLabel[];
  initialCopies?: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Extrae solo los códigos SKU del campo products */
function extractSkusOnly(products: string | null): string {
  if (!products) return "—";
  const matches = [...products.matchAll(/\(SKU:\s*([^)]+)\)/gi)];
  if (matches.length > 0) return matches.map((m) => m[1].trim()).join("\n");
  // Si no hay formato SKU, mostrar el texto completo como fallback
  return products.trim() || "—";
}

function buildLabelHtml(s: ShipmentForLabel): string {
  const order = s.orderNumber
    ? `<span style="font-size:7pt;color:#555">#${esc(s.orderNumber)}</span>`
    : "";

  const extra = s.addressExtra
    ? `<p style="font-size:8pt;color:#444;margin:0 0 1mm">${esc(s.addressExtra)}</p>`
    : "";

  const phone = s.recipientPhone
    ? `<p style="font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:.5px;margin:0 0 .5mm">TEL</p>
       <p style="font-size:9pt;margin:0 0 2.5mm">${esc(s.recipientPhone)}</p>`
    : "";

  const skus = extractSkusOnly(s.products);
  const skuBlock = `
    <p style="font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:.5px;margin:0 0 .5mm">SKU</p>
    <p style="font-size:9pt;font-weight:bold;color:#222;margin:0 0 2.5mm;line-height:1.4;white-space:pre-line">${esc(skus)}</p>
  `;

  return `
<div style="
  width:100mm;height:100mm;padding:5mm;
  display:flex;flex-direction:column;
  font-family:Arial,Helvetica,sans-serif;
  box-sizing:border-box;overflow:hidden;
  background:white;
  page-break-after:always;break-after:page;
">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #000;padding-bottom:2mm;margin-bottom:3mm">
    <div style="display:flex;align-items:baseline;gap:2mm">
      <span style="font-size:7pt;color:#555;font-weight:normal;letter-spacing:.3px">LOGÍSTICA</span>
      <span style="font-size:9pt;font-weight:bold;letter-spacing:.5px;color:#1d4ed8">SLEEPBOX</span>
    </div>
    ${order}
  </div>
  <p style="font-size:13pt;font-weight:bold;line-height:1.2;margin:0 0 2mm">${esc(s.recipientName)}</p>
  <p style="font-size:9pt;font-weight:600;margin:0 0 .5mm;line-height:1.3">${esc(s.addressLine)}</p>
  ${extra}
  <p style="font-size:8.5pt;margin:0 0 2.5mm">${esc(s.city)}, ${esc(s.province)}${s.postalCode ? ` CP ${esc(s.postalCode)}` : ""}</p>
  ${phone}
  ${skuBlock}
  <div style="margin-top:auto;border-top:1px dashed #bbb;padding-top:2mm">
    <p style="font-size:6.5pt;color:#555;text-transform:uppercase;letter-spacing:.5px;margin:0 0 .5mm">SEGUIMIENTO</p>
    <p style="font-size:7pt;word-break:break-all;color:#333;margin:0;line-height:1.3">/seguimiento/${esc(s.trackingToken)}</p>
  </div>
</div>`;
}

// ─── HTML para la ventana de impresión ───────────────────────────────────────

function buildPrintHtml(shipments: ShipmentForLabel[], copies: Record<string, number>): string {
  const labelsHtml = shipments
    .flatMap((s) => Array.from({ length: copies[s.id] ?? 1 }, () => buildLabelHtml(s)))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Etiquetas — SleepBox</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:white; }
    @page { size:100mm 100mm; margin:0; }
  </style>
</head>
<body>${labelsHtml}</body>
</html>`;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function LabelPrint({ shipments, initialCopies }: LabelPrintProps) {
  const [isPending, startTransition] = useTransition();
  const [copies, setCopies] = useState<Record<string, number>>(
    initialCopies ?? Object.fromEntries(shipments.map((s) => [s.id, 1]))
  );

  const totalLabels = shipments.reduce((sum, s) => sum + (copies[s.id] ?? 1), 0);

  function setCopiesFor(id: string, value: number) {
    setCopies((prev) => ({ ...prev, [id]: Math.max(1, Math.min(10, value)) }));
  }

  function handlePrint() {
    const html = buildPrintHtml(shipments, copies);
    const win = window.open("", "_blank");
    if (!win) {
      alert("El navegador bloqueó la ventana emergente. Permití popups para este sitio e intentá de nuevo.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.addEventListener("load", () => setTimeout(() => win.print(), 250));
    setTimeout(() => { if (!win.closed) win.print(); }, 700);
  }

  function handleConfirm() {
    startTransition(async () => {
      const uniqueIds = [...new Set(shipments.map((s) => s.id))];
      await confirmLabels(uniqueIds);
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Barra de control */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/shipments" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <span className="text-gray-300">|</span>
          <p className="text-sm font-medium text-gray-900">
            {totalLabels === 1 ? "1 etiqueta" : `${totalLabels} etiquetas`}
            {totalLabels !== shipments.length && (
              <span className="text-gray-400 font-normal ml-1">({shipments.length} envíos)</span>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 h-9 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 h-9 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar impresión
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2">
        <p className="text-xs text-blue-700">
          Ajustá las copias → <strong>Imprimir</strong> → <strong>Confirmar impresión</strong>.
        </p>
      </div>

      {/* Previsualización */}
      <div className="flex-1 overflow-auto bg-gray-100 p-6">
        <div className="space-y-6 max-w-fit mx-auto">
          {shipments.map((s) => {
            const n = copies[s.id] ?? 1;
            const skus = extractSkusOnly(s.products);
            return (
              <div key={s.id} className="flex flex-col items-center gap-2">
                {/* Selector de copias */}
                <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-2 shadow-sm">
                  <span className="text-sm text-gray-600 font-medium truncate max-w-[160px]">
                    {s.recipientName}
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => setCopiesFor(s.id, n - 1)}
                      disabled={n <= 1}
                      className="w-6 h-6 rounded-full flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold text-gray-900 w-5 text-center">{n}</span>
                    <button
                      onClick={() => setCopiesFor(s.id, n + 1)}
                      disabled={n >= 10}
                      className="w-6 h-6 rounded-full flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-xs text-gray-400 ml-1">
                      {n === 1 ? "copia" : "copias"}
                    </span>
                  </div>
                </div>

                {/* Etiqueta preview */}
                <div
                  className="bg-white shadow-md overflow-hidden"
                  style={{ width: "100mm", height: "100mm", padding: "5mm", display: "flex", flexDirection: "column", fontFamily: "Arial, Helvetica, sans-serif", boxSizing: "border-box" }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #000", paddingBottom: "2mm", marginBottom: "3mm" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "2mm" }}>
                      <span style={{ fontSize: "7pt", color: "#555", fontWeight: "normal" }}>LOGÍSTICA</span>
                      <span style={{ fontSize: "9pt", fontWeight: "bold", color: "#1d4ed8" }}>SLEEPBOX</span>
                    </div>
                    {s.orderNumber && <span style={{ fontSize: "7pt", color: "#555" }}>#{s.orderNumber}</span>}
                  </div>
                  {/* Nombre */}
                  <p style={{ fontSize: "13pt", fontWeight: "bold", lineHeight: 1.2, margin: "0 0 2mm" }}>{s.recipientName}</p>
                  {/* Dirección */}
                  <p style={{ fontSize: "9pt", fontWeight: 600, margin: "0 0 0.5mm", lineHeight: 1.3 }}>{s.addressLine}</p>
                  {s.addressExtra && <p style={{ fontSize: "8pt", color: "#444", margin: "0 0 0.5mm" }}>{s.addressExtra}</p>}
                  <p style={{ fontSize: "8.5pt", margin: "0 0 2.5mm" }}>{s.city}, {s.province}{s.postalCode ? ` CP ${s.postalCode}` : ""}</p>
                  {/* Teléfono */}
                  {s.recipientPhone && (
                    <>
                      <p style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.5mm" }}>TEL</p>
                      <p style={{ fontSize: "9pt", margin: "0 0 2.5mm" }}>{s.recipientPhone}</p>
                    </>
                  )}
                  {/* SKU */}
                  <p style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.5mm" }}>SKU</p>
                  <p style={{ fontSize: "9pt", fontWeight: "bold", color: "#222", margin: "0 0 2.5mm", lineHeight: 1.4, whiteSpace: "pre-line" }}>{skus}</p>
                  {/* Tracking */}
                  <div style={{ marginTop: "auto", borderTop: "1px dashed #bbb", paddingTop: "2mm" }}>
                    <p style={{ fontSize: "6.5pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.5mm" }}>SEGUIMIENTO</p>
                    <p style={{ fontSize: "7pt", wordBreak: "break-all", color: "#333", margin: 0, lineHeight: 1.3 }}>/seguimiento/{s.trackingToken}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
