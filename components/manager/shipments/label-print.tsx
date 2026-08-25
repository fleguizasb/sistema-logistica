"use client";

import { useState, useTransition } from "react";
import { confirmLabels } from "@/lib/actions/labels";
import { Printer, ArrowLeft, Loader2, Plus, Minus } from "lucide-react";
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

interface ParsedProduct {
  sku: string | null;
  name: string;
  qty: number;
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

/**
 * Parsea el campo `products` en una lista de items con sku, nombre y cantidad.
 * Formatos soportados:
 *   "Nombre (SKU: CODIGO)"           → { sku: "CODIGO", name: "Nombre", qty: 1 }
 *   "Nombre (SKU: CODIGO, qty: 2)"   → { sku: "CODIGO", name: "Nombre", qty: 2 }
 *   "Texto libre"                    → { sku: null, name: "Texto libre", qty: 1 }
 */
function parseProducts(products: string | null): ParsedProduct[] {
  if (!products) return [];
  return products
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.*?)\s*\(SKU:\s*([^,)]+)(?:,\s*qty:\s*(\d+))?\)/i);
      if (match) {
        return {
          name: match[1].trim() || match[2].trim(),
          sku: match[2].trim(),
          qty: match[3] ? parseInt(match[3], 10) : 1,
        };
      }
      return { name: line, sku: null, qty: 1 };
    });
}

/** Extrae SKUs con su cantidad del campo products para mostrar en la etiqueta. */
function extractSkusOnly(products: string | null): string {
  if (!products) return "—";
  const items = parseProducts(products);
  const skuItems = items.filter((i) => i.sku !== null);
  if (skuItems.length > 0) {
    return skuItems.map((i) => (i.qty > 1 ? `${i.sku} ×${i.qty}` : i.sku!)).join("\n");
  }
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

  // class="label" hace que @page labels { size:100mm 100mm } se aplique a esta página
  return `
<div class="label" style="
  width:100mm;height:100mm;padding:5mm;
  display:flex;flex-direction:column;
  font-family:Arial,Helvetica,sans-serif;
  box-sizing:border-box;overflow:hidden;
  background:white;
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
    <p style="font-size:7pt;word-break:break-all;color:#333;margin:0;line-height:1.3">/tracking/${esc(s.trackingToken)}</p>
  </div>
</div>`;
}

// ─── Hoja de preparación ──────────────────────────────────────────────────────

/**
 * Genera la hoja de preparación (última página, A4).
 * Agrega los SKUs de todos los envíos × copias y muestra:
 *   1. Tabla de SKUs totales a preparar
 *   2. Detalle por envío
 */
function buildSummaryHtml(shipments: ShipmentForLabel[], copies: Record<string, number>): string {
  // Agregar SKUs multiplicando por cantidad de copias
  const skuMap = new Map<string, { name: string; qty: number }>();

  for (const s of shipments) {
    const labelCopies = copies[s.id] ?? 1;
    for (const item of parseProducts(s.products)) {
      if (!item.sku) continue;
      const existing = skuMap.get(item.sku);
      if (existing) {
        existing.qty += item.qty * labelCopies;
      } else {
        skuMap.set(item.sku, { name: item.name, qty: item.qty * labelCopies });
      }
    }
  }

  const skuRows = [...skuMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sku, { name, qty }], i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
        <td style="padding:2.5mm 3mm;border:1px solid #e5e7eb;font-weight:bold">${esc(sku)}</td>
        <td style="padding:2.5mm 3mm;border:1px solid #e5e7eb">${esc(name)}</td>
        <td style="padding:2.5mm 3mm;border:1px solid #e5e7eb;text-align:center;font-size:12pt;font-weight:bold;color:#1d4ed8">${qty}</td>
      </tr>`)
    .join("");

  const shipmentRows = shipments
    .map((s, i) => {
      const c = copies[s.id] ?? 1;
      const items = parseProducts(s.products);
      const productStr = items
        .map((item) =>
          item.sku
            ? item.qty > 1 ? `${item.sku} ×${item.qty}` : item.sku
            : item.name
        )
        .join(", ");
      return `
        <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
          <td style="padding:2mm 3mm;border:1px solid #e5e7eb;font-weight:600">${esc(s.recipientName)}</td>
          <td style="padding:2mm 3mm;border:1px solid #e5e7eb">${esc(s.city)}</td>
          <td style="padding:2mm 3mm;border:1px solid #e5e7eb;font-size:8pt">${esc(productStr || "—")}</td>
          <td style="padding:2mm 3mm;border:1px solid #e5e7eb;text-align:center;font-weight:bold">${c}</td>
        </tr>`;
    })
    .join("");

  const totalLabels = shipments.reduce((sum, s) => sum + (copies[s.id] ?? 1), 0);
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  return `
<div class="summary-page">
  <!-- Encabezado -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #1d4ed8;padding-bottom:4mm;margin-bottom:6mm">
    <div>
      <div style="display:flex;align-items:baseline;gap:2mm;margin-bottom:1.5mm">
        <span style="font-size:9pt;color:#555;font-weight:normal;letter-spacing:.3px">LOGÍSTICA</span>
        <span style="font-size:13pt;font-weight:bold;letter-spacing:.5px;color:#1d4ed8">SLEEPBOX</span>
      </div>
      <h1 style="font-size:18pt;font-weight:bold;color:#111;margin:0;line-height:1">Hoja de Preparación</h1>
    </div>
    <div style="text-align:right;font-size:8.5pt;color:#555;line-height:1.6">
      <p style="margin:0">${dateStr} — ${timeStr}</p>
      <p style="margin:0;font-weight:bold;color:#111">${shipments.length} envío${shipments.length !== 1 ? "s" : ""} · ${totalLabels} etiqueta${totalLabels !== 1 ? "s" : ""}</p>
    </div>
  </div>

  <!-- Tabla 1: SKUs a preparar -->
  <h2 style="font-size:10pt;font-weight:bold;color:#1d4ed8;margin:0 0 3mm;text-transform:uppercase;letter-spacing:.8px">▸ SKUs a preparar</h2>
  <table style="width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:8mm">
    <thead>
      <tr style="background:#1d4ed8;color:white">
        <th style="text-align:left;padding:2.5mm 3mm;width:28%">SKU</th>
        <th style="text-align:left;padding:2.5mm 3mm">Descripción</th>
        <th style="text-align:center;padding:2.5mm 3mm;width:14%">Cant.</th>
      </tr>
    </thead>
    <tbody>
      ${skuRows || `<tr><td colspan="3" style="padding:4mm;color:#888;text-align:center;border:1px solid #e5e7eb">Sin SKUs registrados</td></tr>`}
    </tbody>
  </table>

  <!-- Tabla 2: Detalle por envío -->
  <h2 style="font-size:10pt;font-weight:bold;color:#1d4ed8;margin:0 0 3mm;text-transform:uppercase;letter-spacing:.8px">▸ Detalle por envío</h2>
  <table style="width:100%;border-collapse:collapse;font-size:9pt">
    <thead>
      <tr style="background:#f3f4f6;color:#111">
        <th style="text-align:left;padding:2mm 3mm;border:1px solid #d1d5db;width:28%">Destinatario</th>
        <th style="text-align:left;padding:2mm 3mm;border:1px solid #d1d5db;width:20%">Ciudad</th>
        <th style="text-align:left;padding:2mm 3mm;border:1px solid #d1d5db">Productos</th>
        <th style="text-align:center;padding:2mm 3mm;border:1px solid #d1d5db;width:12%">Etiq.</th>
      </tr>
    </thead>
    <tbody>
      ${shipmentRows}
    </tbody>
  </table>
</div>`;
}

// ─── HTML para la ventana de impresión ───────────────────────────────────────

function buildPrintHtml(shipments: ShipmentForLabel[], copies: Record<string, number>): string {
  const labelsHtml = shipments
    .flatMap((s) => Array.from({ length: copies[s.id] ?? 1 }, () => buildLabelHtml(s)))
    .join("\n");

  const summaryHtml = buildSummaryHtml(shipments, copies);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Etiquetas — SleepBox</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:white; font-family:Arial,Helvetica,sans-serif; }

    /* Página de etiqueta: 100×100 mm sin márgenes */
    @page labels { size:100mm 100mm; margin:0; }
    .label { page:labels; break-after:page; }

    /* Hoja de preparación: A4 con márgenes normales */
    @page summary { size:A4; margin:15mm 18mm; }
    .summary-page { page:summary; break-before:page; }
  </style>
</head>
<body>
${labelsHtml}
${summaryHtml}
</body>
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

    // Confirmar impresión automáticamente al imprimir
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
            disabled={isPending}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 h-9 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Imprimir etiquetas
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2">
        <p className="text-xs text-blue-700">
          Ajustá las copias y presioná <strong>Imprimir etiquetas</strong>. Los envíos pasarán a <strong>Listo para enviar</strong> automáticamente. La última página es la hoja de preparación con el resumen de SKUs.
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
                    <p style={{ fontSize: "7pt", wordBreak: "break-all", color: "#333", margin: 0, lineHeight: 1.3 }}>/tracking/{s.trackingToken}</p>
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
