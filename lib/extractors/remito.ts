/**
 * Extractor de remitos (formato Contabilium/SleepBox).
 *
 * IMPORTANTE: pdf-parse genera texto donde varios campos quedan pegados sin salto
 * de línea. Ejemplos reales:
 *   "Ubicación: BERAZATEGUI, Buenos AiresDNI: 20227173387"
 *   "Condición de venta: MercadoPagoCondición de IVA: Consumidor final"
 *   "PLUMON 260X280 KING BLANCO1"   ← número pegado al final
 *   "1Set toallon y toalla - ..."    ← número pegado al inicio
 *
 * La estrategia es trabajar sobre el texto crudo con regex en lugar de
 * asumir saltos de línea limpios entre campos.
 */

import type { ExtractedShipment } from "./types";

export function extractRemito(text: string): ExtractedShipment[] {
  // ── Nombre del destinatario ───────────────────────────────────────────────────
  const razonMatch = text.match(/Razón social:\s*([^\n]+?)(?=\n|DNI:|Domicilio:|$)/i);
  const recipientName = razonMatch ? razonMatch[1].trim() : "";
  if (!recipientName) return [];

  // ── Domicilio → dirección, CP, teléfono ──────────────────────────────────────
  // Formato: "Domicilio: CALLE 3 - N° 294  - CP 1884. Tel: 1161578472"
  const domMatch = text.match(/Domicilio:\s*([^\n]+?)(?=\n|Ubicación:|DNI:|$)/i);
  let addressLine = "";
  let postalCode: string | undefined;
  let recipientPhone: string | undefined;

  if (domMatch) {
    const domText = domMatch[1].trim();

    const cpMatch = domText.match(/CP\s*(\d{3,5})/i);
    if (cpMatch) postalCode = cpMatch[1];

    const telMatch = domText.match(/\.?\s*Tel:\s*([+\d\s]+)/i);
    if (telMatch) recipientPhone = telMatch[1].trim().replace(/\s+/g, "");

    // Dirección: todo antes de "- CP" o ". Tel:"
    addressLine = domText
      .split(/\s*-\s*CP\s*\d+/i)[0]
      .split(/\s*\.?\s*Tel:/i)[0]
      .trim();
  }

  // ── Ciudad y Provincia ────────────────────────────────────────────────────────
  // Puede aparecer como "Ubicación: BERAZATEGUI, Buenos AiresDNI: ..."
  const ubicMatch = text.match(/Ubicación:\s*([^\n]+?)(?=DNI:|Condición|$)/i);
  let city = "";
  let province = "";

  if (ubicMatch) {
    const ubicText = ubicMatch[1].trim();
    const parts = ubicText.split(",").map((p) => p.trim());
    city = parts[0] ?? "";
    province = parts[1] ?? "";
  }

  // ── Número de documento ───────────────────────────────────────────────────────
  const nroMatch = text.match(/Nº:\s*([\d-]+)/);
  const orderNumber = nroMatch ? nroMatch[1] : undefined;

  // ── Productos ─────────────────────────────────────────────────────────────────
  // Buscar el índice donde empieza la sección de productos.
  // "Condición de IVA:" puede estar pegado a otra línea.
  const condIvaIdx = text.indexOf("Condición de IVA:");
  const cantTotalIdx = text.indexOf("Cantidad total:");

  let products: string | undefined;

  if (condIvaIdx !== -1) {
    // Tomar el texto desde el final de la línea de "Condición de IVA:..."
    const afterCondIva = text.slice(condIvaIdx);
    // Saltar hasta el primer salto de línea (termina la línea mezclada)
    const firstNewline = afterCondIva.indexOf("\n");
    const productSection = firstNewline !== -1
      ? afterCondIva.slice(firstNewline)
      : afterCondIva;

    const endIdx = cantTotalIdx !== -1 ? cantTotalIdx - condIvaIdx - firstNewline : undefined;
    const productText = endIdx ? productSection.slice(0, endIdx) : productSection;

    // SKU pattern: letras mayúsculas, guion, alfanumérico
    const skuPattern = /^[A-Z]{2,}[-_][\w-]+$/;

    const seen = new Set<string>();
    const productList: string[] = [];

    for (let line of productText.split("\n")) {
      // Limpiar números pegados al inicio y al final
      line = line.replace(/^\d+/, "").replace(/\d+$/, "").trim();

      if (!line || line.length < 4) continue;
      if (skuPattern.test(line)) continue;
      if (/^\d+$/.test(line)) continue;
      if (/^(VPS:|Cantidad|Condición|DNI:|Ubicación:|Domicilio:|Razón|Sleep|JOSE LEON|Au Cam|Tel\.|Responsable|^R$|Cod\.|Remito|Original|Nº:|Fecha:|CUIT:|Ingresos|Inicio|Recibí|Powered)/i.test(line)) continue;

      if (!seen.has(line)) {
        seen.add(line);
        productList.push(line);
      }
    }

    if (productList.length > 0) {
      products = productList.join(", ");
    }
  }

  return [
    {
      orderNumber,
      recipientName,
      recipientPhone,
      addressLine,
      city,
      province,
      postalCode,
      products,
      source: "REMITO",
    },
  ];
}
