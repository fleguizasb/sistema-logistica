"use client";

import { useTransition } from "react";
import { confirmLabels } from "@/lib/actions/labels";
import { Printer, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
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

// ─── HTML para la ventana de impresión ───────────────────────────────────────

function buildPrintHtml(shipments: ShipmentForLabel[]): string {
  const labelsHtml = shipments
    .map((s) => {
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

      // Limitar productos a 3 líneas para que entren en 10x10
      const rawProducts = (s.products ?? "").trim();
      const productDisplay = rawProducts || "—";

      const products = `<p style="font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:.5px;margin:0 0 .5mm">PRODUCTOS</p>
           <p style="font-size:8pt;color:#222;margin:0 0 2.5mm;line-height:1.3;white-space:pre-line">${esc(productDisplay)}</p>`;

      return `
<div style="
  width:100mm;height:100mm;padding:5mm;
  display:flex;flex-direction:column;
  font-family:Arial,Helvetica,sans-serif;
  box-sizing:border-box;overflow:hidden;
  background:white;
  page-break-after:always;break-after:page;
">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #000;padding-bottom:2mm;margin-bottom:3mm">
    <span style="font-size:8pt;font-weight:bold;letter-spacing:.5px">SISTEMA LOGÍSTICO</span>
    ${order}
  </div>

  <!-- Destinatario -->
  <p style="font-size:13pt;font-weight:bold;line-height:1.2;margin:0 0 2mm">${esc(s.recipientName)}</p>

  <!-- Dirección -->
  <p style="font-size:9pt;font-weight:600;margin:0 0 .5mm;line-height:1.3">${esc(s.addressLine)}</p>
  ${extra}
  <p style="font-size:8.5pt;margin:0 0 2.5mm">${esc(s.city)}, ${esc(s.province)}${s.postalCode ? ` CP ${esc(s.postalCode)}` : ""}</p>

  ${phone}
  ${products}

  <!-- Separador y tracking -->
  <div style="margin-top:auto;border-top:1px dashed #bbb;padding-top:2mm">
    <p style="font-size:6.5pt;color:#555;text-transform:uppercase;letter-spacing:.5px;margin:0 0 .5mm">SEGUIMIENTO</p>
    <p style="font-size:7pt;word-break:break-all;color:#333;margin:0;line-height:1.3">/seguimiento/${esc(s.trackingToken)}</p>
  </div>
</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Etiquetas</title>
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

export function LabelPrint({ shipments }: LabelPrintProps) {
  const [isPending, startTransition] = useTransition();

  function handlePrint() {
    const html = buildPrintHtml(shipments);
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
      await confirmLabels(shipments.map((s) => s.id));
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Barra de control */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/shipments"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <span className="text-gray-300">|</span>
          <p className="text-sm font-medium text-gray-900">
            {shipments.length === 1 ? "1 etiqueta" : `${shipments.length} etiquetas`}
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
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Confirmar impresión
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2">
        <p className="text-xs text-blue-700">
          Hacé clic en <strong>Imprimir</strong> → se abre una ventana con las etiquetas → imprimí →
          volvé acá y hacé clic en <strong>Confirmar impresión</strong>.
        </p>
      </div>

      {/* Previsualización */}
      <div className="flex-1 overflow-auto bg-gray-100 p-6">
        <div className="space-y-4 max-w-fit mx-auto">
          {shipments.map((s) => (
            <LabelPreview key={s.id} shipment={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Previsualización en pantalla (10×10cm) ───────────────────────────────────

function LabelPreview({ shipment }: { shipment: ShipmentForLabel }) {
  return (
    <div
      className="bg-white shadow-md overflow-hidden"
      style={{
        width: "100mm",
        height: "100mm",
        padding: "5mm",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, Helvetica, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1.5px solid #000",
          paddingBottom: "2mm",
          marginBottom: "3mm",
        }}
      >
        <span style={{ fontSize: "8pt", fontWeight: "bold" }}>SISTEMA LOGÍSTICO</span>
        {shipment.orderNumber && (
          <span style={{ fontSize: "7pt", color: "#555" }}>#{shipment.orderNumber}</span>
        )}
      </div>

      {/* Nombre */}
      <p style={{ fontSize: "13pt", fontWeight: "bold", lineHeight: 1.2, margin: "0 0 2mm" }}>
        {shipment.recipientName}
      </p>

      {/* Dirección */}
      <p style={{ fontSize: "9pt", fontWeight: 600, margin: "0 0 0.5mm", lineHeight: 1.3 }}>
        {shipment.addressLine}
      </p>
      {shipment.addressExtra && (
        <p style={{ fontSize: "8pt", color: "#444", margin: "0 0 0.5mm" }}>{shipment.addressExtra}</p>
      )}
      <p style={{ fontSize: "8.5pt", margin: "0 0 2.5mm" }}>
        {shipment.city}, {shipment.province}
        {shipment.postalCode ? ` CP ${shipment.postalCode}` : ""}
      </p>

      {/* Teléfono */}
      {shipment.recipientPhone && (
        <>
          <p style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.5mm" }}>TEL</p>
          <p style={{ fontSize: "9pt", margin: "0 0 2.5mm" }}>{shipment.recipientPhone}</p>
        </>
      )}

      {/* Productos — siempre visible */}
      <p style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.5mm" }}>PRODUCTOS</p>
      <p style={{ fontSize: "8pt", color: "#222", margin: "0 0 2.5mm", lineHeight: 1.3, whiteSpace: "pre-line" }}>
        {(shipment.products ?? "").trim() || "—"}
      </p>

      {/* Tracking */}
      <div style={{ marginTop: "auto", borderTop: "1px dashed #bbb", paddingTop: "2mm" }}>
        <p style={{ fontSize: "6.5pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.5mm" }}>
          SEGUIMIENTO
        </p>
        <p style={{ fontSize: "7pt", wordBreak: "break-all", color: "#333", margin: 0, lineHeight: 1.3 }}>
          /seguimiento/{shipment.trackingToken}
        </p>
      </div>
    </div>
  );
}
