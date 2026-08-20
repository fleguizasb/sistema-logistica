/**
 * Extractor de remitos (formato Contabilium/SleepBox).
 *
 * pdf-parse genera texto donde varios campos quedan pegados sin salto de línea:
 *   "Ubicación: BERAZATEGUI, Buenos AiresDNI: 20227173387"
 *   "Condición de venta: MercadoPagoCondición de IVA: Consumidor final"
 *   "PLUMON 260X280 KING BLANCO1"   ← número pegado al final
 *   "1Set toallon y toalla - ..."    ← número pegado al inicio
 *
 * Los productos se almacenan como "NOMBRE (SKU: CODIGO)" cuando hay SKU,
 * o solo "NOMBRE" cuando no hay SKU, igual que el extractor de TiendaNube.
 */

import type { ExtractedShipment } from "./types";

const SKU_PATTERN = /^[A-Z]{2,}[-_][\w-]+$/;

export function extractRemito(text: string): ExtractedShipment[] {
  // ── Nombre del destinatario ───────────────────────────────────────────────────
  const razonMatch = text.match(/Razón social:\s*([^\n]+?)(?=\n|DNI:|Domicilio:|$)/i);
  const recipientName = razonMatch ? razonMatch[1].trim() : "";
  if (!recipientName) return [];

  // ── Domicilio → dirección, CP, teléfono ──────────────────────────────────────
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
    addressLine = domText
      .split(/\s*-\s*CP\s*\d+/i)[0]
      .split(/\s*\.?\s*Tel:/i)[0]
      .trim();
  }

  // ── Ciudad y Provincia ────────────────────────────────────────────────────────
  const ubicMatch = text.match(/Ubicación:\s*([^\n]+?)(?=DNI:|Condición|$)/i);
  let city = "";
  let province = "";
  if (ubicMatch) {
    const parts = ubicMatch[1].trim().split(",").map((p) => p.trim());
    city = parts[0] ?? "";
    province = parts[1] ?? "";
  }

  // ── Número de documento ───────────────────────────────────────────────────────
  const nroMatch = text.match(/Nº:\s*([\d-]+)/);
  const orderNumber = nroMatch ? nroMatch[1] : undefined;

  // ── Productos con SKU ─────────────────────────────────────────────────────────
  const condIvaIdx = text.indexOf("Condición de IVA:");
  const cantTotalIdx = text.indexOf("Cantidad total:");
  let products: string | undefined;

  if (condIvaIdx !== -1) {
    const afterCondIva = text.slice(condIvaIdx);
    const firstNewline = afterCondIva.indexOf("\n");
    const productSection =
      firstNewline !== -1 ? afterCondIva.slice(firstNewline) : afterCondIva;
    const endIdx =
      cantTotalIdx !== -1
        ? cantTotalIdx - condIvaIdx - firstNewline
        : undefined;
    const productText = endIdx
      ? productSection.slice(0, endIdx)
      : productSection;

    // Construir pares SKU → nombre
    // El patrón en pdf-parse es: [cantidad?] [SKU?] [nombre con cantidad pegada?]
    const rawLines = productText
      .split("\n")
      .map((l) => l.replace(/^\d+/, "").replace(/\d+$/, "").trim()) // limpiar números pegados
      .filter((l) => l.length >= 2);

    // Recorrer líneas y asociar SKU con el nombre que le sigue
    const seenNames = new Set<string>();
    const productItems: string[] = [];
    let pendingSku: string | null = null;

    for (const line of rawLines) {
      if (SKU_PATTERN.test(line)) {
        pendingSku = line;
        continue;
      }
      // Filtrar basura del encabezado del remito
      if (
        /^(VPS:|Cantidad|Condición|DNI:|Ubicación:|Domicilio:|Razón|Sleep|JOSE LEON|Au Cam|Tel\.|Responsable|Cod\.|Remito|Original|Nº:|Fecha:|CUIT:|Ingresos|Inicio|Recibí|Powered)/i.test(
          line
        )
      ) {
        pendingSku = null;
        continue;
      }

      // Es una línea de nombre de producto
      const entry = pendingSku ? `${line} (SKU: ${pendingSku})` : line;
      pendingSku = null;

      if (!seenNames.has(entry)) {
        seenNames.add(entry);
        productItems.push(entry);
      }
    }

    if (productItems.length > 0) {
      products = productItems.join("\n");
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
