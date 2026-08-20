"use client";

import { useState, useTransition } from "react";
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

// ─── Generar HTML puro para impresión ─────────────────────────────────────────

function buildPrintHtml(shipments: ShipmentForLabel[]): string {
  const labelsHtml = shipments
    .map((s) => {
      const tracking = `/seguimiento/${s.trackingToken}`;
      const extra = s.addressExtra
        ? `<p style="font-size:9pt;color:#444;margin:0 0 1.5mm 0">${s.addressExtra}</p>`
        : "";
      const phone = s.recipientPhone
        ? `<div style="margin-bottom:4mm">
            <p style="font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:.5px;margin:0 0 1mm 0">TELÉFONO</p>
            <p style="font-size:10pt;margin:0">${s.recipientPhone}</p>
           </div>`
        : "";
      const order = s.orderNumber
        ? `<span style="font-size:8pt;color:#555">#${s.orderNumber}</span>`
        : "";
      const products = s.products
        ? `<div style="margin-bottom:4mm">
            <p style="font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:.5px;margin:0 0 1mm 0">PRODUCTOS</p>
            <p style="font-size:8pt;color:#333;margin:0;line-height:1.4;white-space:pre-line">${s.products}</p>
           </div>`
        : "";

      return `
        <div style="
          width:100mm; height:150mm; padding:6mm;
          display:flex; flex-direction:column;
          font-family:Arial,sans-serif;
          box-sizing:border-box; overflow:hidden;
          background:white;
          page-break-after:always; break-after:page;
        ">
          <!-- Header -->
          <div style="border-bottom:1.5px solid #000;padding-bottom:3mm;margin-bottom:4mm;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:10pt;font-weight:bold;letter-spacing:.5px">SISTEMA LOGÍSTICO</span>
            ${order}
          </div>

          <!-- Destinatario -->
          <div style="margin-bottom:4mm">
            <p style="font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:.5px;margin:0 0 1mm 0">DESTINATARIO</p>
            <p style="font-size:15pt;font-weight:bold;line-height:1.2;margin:0">${s.recipientName}</p>
          </div>

          <!-- Dirección -->
          <div style="margin-bottom:4mm">
            <p style="font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:.5px;margin:0 0 1mm 0">DIRECCIÓN DE ENTREGA</p>
            <p style="font-size:11pt;font-weight:600;margin:0 0 1mm 0;line-height:1.3">${s.addressLine}</p>
            ${extra}
            <p style="font-size:10pt;margin:0">${s.city}, ${s.province}${s.postalCode ? ` (CP ${s.postalCode})` : ""}</p>
          </div>

          ${phone}
          ${products}

          <!-- Separador -->
          <div style="border-top:1px dashed #ccc;margin:auto 0 4mm 0"></div>

          <!-- Tracking -->
          <div>
            <p style="font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:.5px;margin:0 0 1.5mm 0">CÓDIGO DE SEGUIMIENTO</p>
            <p style="font-size:8pt;word-break:break-all;color:#333;margin:0;line-height:1.4">${tracking}</p>
          </div>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Etiquetas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; }
    @page { size: 100mm 150mm; margin: 0; }
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
    // Esperar a que cargue antes de imprimir
    win.addEventListener("load", () => {
      setTimeout(() => {
        win.print();
      }, 300);
    });
    // Fallback por si el evento load ya ocurrió
    setTimeout(() => {
      if (!win.closed) win.print();
    }, 600);
  }

  function handleConfirm() {
    startTransition(async () => {
      await confirmLabels(shipments.map((s) => s.id));
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── Barra de control ── */}
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
            {shipments.length === 1
              ? "1 etiqueta"
              : `${shipments.length} etiquetas`}
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

      {/* ── Nota ── */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2">
        <p className="text-xs text-blue-700">
          Hacé clic en <strong>Imprimir</strong> para abrir el diálogo. Después de imprimir, confirmá para mover los envíos a <strong>Listo para enviar</strong>.
        </p>
      </div>

      {/* ── Previsualización en pantalla ── */}
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

// ─── Previsualización (solo pantalla) ─────────────────────────────────────────

function LabelPreview({ shipment }: { shipment: ShipmentForLabel }) {
  return (
    <div
      className="bg-white shadow-md"
      style={{
        width: "100mm",
        minHeight: "150mm",
        padding: "6mm",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        fontSize: "10pt",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1.5px solid #000",
          paddingBottom: "3mm",
          marginBottom: "4mm",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "10pt", fontWeight: "bold" }}>SISTEMA LOGÍSTICO</span>
        {shipment.orderNumber && (
          <span style={{ fontSize: "8pt", color: "#555" }}>#{shipment.orderNumber}</span>
        )}
      </div>

      {/* Destinatario */}
      <div style={{ marginBottom: "4mm" }}>
        <p style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1mm" }}>
          DESTINATARIO
        </p>
        <p style={{ fontSize: "15pt", fontWeight: "bold", lineHeight: "1.2", margin: 0 }}>
          {shipment.recipientName}
        </p>
      </div>

      {/* Dirección */}
      <div style={{ marginBottom: "4mm" }}>
        <p style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1mm" }}>
          DIRECCIÓN DE ENTREGA
        </p>
        <p style={{ fontSize: "11pt", fontWeight: 600, margin: "0 0 1mm", lineHeight: "1.3" }}>
          {shipment.addressLine}
        </p>
        {shipment.addressExtra && (
          <p style={{ fontSize: "9pt", color: "#444", margin: "0 0 1mm" }}>{shipment.addressExtra}</p>
        )}
        <p style={{ fontSize: "10pt", margin: 0 }}>
          {shipment.city}, {shipment.province}
          {shipment.postalCode ? ` (CP ${shipment.postalCode})` : ""}
        </p>
      </div>

      {/* Teléfono */}
      {shipment.recipientPhone && (
        <div style={{ marginBottom: "4mm" }}>
          <p style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1mm" }}>
            TELÉFONO
          </p>
          <p style={{ fontSize: "10pt", margin: 0 }}>{shipment.recipientPhone}</p>
        </div>
      )}

      {/* Productos */}
      {shipment.products && (
        <div style={{ marginBottom: "4mm" }}>
          <p style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1mm" }}>
            PRODUCTOS
          </p>
          <p style={{ fontSize: "8pt", color: "#333", margin: 0, lineHeight: "1.4", whiteSpace: "pre-line" }}>
            {shipment.products}
          </p>
        </div>
      )}

      {/* Separador */}
      <div style={{ borderTop: "1px dashed #ccc", margin: "auto 0 4mm 0" }} />

      {/* Tracking */}
      <div>
        <p style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1.5mm" }}>
          CÓDIGO DE SEGUIMIENTO
        </p>
        <p style={{ fontSize: "8pt", wordBreak: "break-all", color: "#333", margin: 0, lineHeight: "1.4" }}>
          /seguimiento/{shipment.trackingToken}
        </p>
      </div>
    </div>
  );
}
