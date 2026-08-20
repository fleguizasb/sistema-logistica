"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
}

interface LabelPrintProps {
  shipments: ShipmentForLabel[];
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function LabelPrint({ shipments }: LabelPrintProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  function handlePrint() {
    window.print();
  }

  function handleConfirm() {
    startTransition(async () => {
      await confirmLabels(shipments.map((s) => s.id));
      setConfirmed(true);
    });
  }

  return (
    <>
      {/* ── CSS de impresión ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .label-page { margin: 0 !important; padding: 0 !important; }
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
        }
      `}</style>

      {/* ── Barra de control (no se imprime) ── */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
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
              ? "1 etiqueta lista para imprimir"
              : `${shipments.length} etiquetas listas para imprimir`}
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
            disabled={isPending || confirmed}
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

      {/* ── Nota informativa (no se imprime) ── */}
      <div className="no-print bg-blue-50 border-b border-blue-100 px-6 py-2">
        <p className="text-xs text-blue-700">
          Imprimí primero y luego confirmá. Al confirmar, los envíos pasan a estado{" "}
          <strong>Listo para enviar</strong>.
        </p>
      </div>

      {/* ── Etiquetas ── */}
      <div className="label-page bg-gray-100 min-h-screen p-6 no-print-bg">
        <div className="space-y-4 max-w-fit mx-auto">
          {shipments.map((s) => (
            <Label key={s.id} shipment={s} />
          ))}
        </div>
      </div>

      <style>{`
        @media screen {
          .no-print-bg { background: #f3f4f6; }
        }
        @media print {
          .no-print-bg { background: white; padding: 0; }
          .space-y-4 > * + * { margin-top: 0 !important; }
        }
      `}</style>
    </>
  );
}

// ─── Etiqueta individual ──────────────────────────────────────────────────────

function Label({ shipment }: { shipment: ShipmentForLabel }) {
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/seguimiento/${shipment.trackingToken}`;

  return (
    <div
      className="bg-white shadow-md"
      style={{
        width: "100mm",
        height: "150mm",
        padding: "6mm",
        display: "flex",
        flexDirection: "column",
        gap: "0",
        fontFamily: "Arial, sans-serif",
        pageBreakAfter: "always",
        boxSizing: "border-box",
        overflow: "hidden",
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
        <span style={{ fontSize: "10pt", fontWeight: "bold", letterSpacing: "0.5px" }}>
          SISTEMA LOGÍSTICO
        </span>
        {shipment.orderNumber && (
          <span style={{ fontSize: "8pt", color: "#555" }}>
            #{shipment.orderNumber}
          </span>
        )}
      </div>

      {/* Nombre del destinatario */}
      <div style={{ marginBottom: "5mm" }}>
        <p style={{ fontSize: "7pt", color: "#555", marginBottom: "1mm", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          DESTINATARIO
        </p>
        <p style={{ fontSize: "16pt", fontWeight: "bold", lineHeight: "1.2", margin: 0 }}>
          {shipment.recipientName}
        </p>
      </div>

      {/* Dirección */}
      <div style={{ marginBottom: "4mm" }}>
        <p style={{ fontSize: "7pt", color: "#555", marginBottom: "1mm", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          DIRECCIÓN DE ENTREGA
        </p>
        <p style={{ fontSize: "11pt", fontWeight: "600", margin: "0 0 1mm 0", lineHeight: "1.3" }}>
          {shipment.addressLine}
        </p>
        {shipment.addressExtra && (
          <p style={{ fontSize: "9pt", color: "#444", margin: "0 0 1mm 0" }}>
            {shipment.addressExtra}
          </p>
        )}
        <p style={{ fontSize: "10pt", margin: "0 0 1mm 0" }}>
          {shipment.city}, {shipment.province}
          {shipment.postalCode ? ` (CP ${shipment.postalCode})` : ""}
        </p>
      </div>

      {/* Teléfono */}
      {shipment.recipientPhone && (
        <div style={{ marginBottom: "4mm" }}>
          <p style={{ fontSize: "7pt", color: "#555", marginBottom: "1mm", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            TELÉFONO
          </p>
          <p style={{ fontSize: "10pt", margin: 0 }}>{shipment.recipientPhone}</p>
        </div>
      )}

      {/* Separador */}
      <div style={{ borderTop: "1px dashed #ccc", margin: "auto 0 4mm 0" }} />

      {/* Tracking */}
      <div>
        <p style={{ fontSize: "7pt", color: "#555", marginBottom: "1.5mm", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          CÓDIGO DE SEGUIMIENTO
        </p>
        <p style={{ fontSize: "8pt", wordBreak: "break-all", color: "#333", margin: 0, lineHeight: "1.4" }}>
          {trackingUrl}
        </p>
      </div>
    </div>
  );
}
