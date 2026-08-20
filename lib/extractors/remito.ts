/**
 * Extractor de remitos (formato Contabilium/SleepBox).
 *
 * Campos clave en el texto:
 *   Razón social: NOMBRE COMPLETO
 *   Domicilio: CALLE N° XXX  - CP XXXX. Tel: XXXXXXXXXX
 *   Ubicación: CIUDAD, Provincia
 *
 * Los productos aparecen repetidos por el layout multi-columna del PDF;
 * se deduplicarán preservando el orden.
 */

import type { ExtractedShipment } from "./types";

export function extractRemito(text: string): ExtractedShipment[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // ── Nombre del destinatario ───────────────────────────────────────────────────
  const razonLine = lines.find((l) => l.startsWith("Razón social:"));
  const recipientName = razonLine?.replace("Razón social:", "").trim() ?? "";
  if (!recipientName) return [];

  // ── Domicilio → dirección, CP, teléfono ──────────────────────────────────────
  const domicilioLine = lines.find((l) => l.startsWith("Domicilio:"));
  let addressLine = "";
  let postalCode: string | undefined;
  let recipientPhone: string | undefined;

  if (domicilioLine) {
    const domText = domicilioLine.replace("Domicilio:", "").trim();

    // CP: "CP XXXX"
    const cpMatch = domText.match(/CP\s*(\d+)/i);
    if (cpMatch) postalCode = cpMatch[1];

    // Tel: ". Tel: XXXXXXXXXX" — puede venir sin el punto
    const telMatch = domText.match(/\.?\s*Tel:\s*([+\d\s]+)/i);
    if (telMatch) recipientPhone = telMatch[1].trim();

    // Dirección: todo antes de "- CP" o ". Tel:"
    addressLine = domText
      .split(/\s*-\s*CP\s*\d+/i)[0]
      .split(/\s*\.?\s*Tel:/i)[0]
      .trim();
  }

  // ── Ciudad y Provincia ────────────────────────────────────────────────────────
  const ubicacionLine = lines.find((l) => l.startsWith("Ubicación:"));
  let city = "";
  let province = "";

  if (ubicacionLine) {
    // La línea puede tener más columnas a la derecha (ej. "DNI: XXX")
    const ubicText = ubicacionLine
      .replace("Ubicación:", "")
      .split(/\s{2,}/)[0] // cortar columnas adicionales
      .trim();

    const parts = ubicText.split(",").map((p) => p.trim());
    city = parts[0] ?? "";
    province = parts[1] ?? "";
  }

  // ── Número de documento (orden) ───────────────────────────────────────────────
  const nroMatch = text.match(/Nº:\s*([\d-]+)/);
  const orderNumber = nroMatch ? nroMatch[1] : undefined;

  // ── Productos — deduplicar (el PDF los repite por layout multi-columna) ────────
  const skuPattern = /^[A-Z]{2,}-[\w-]+$/;
  const skipPatterns = [
    /^\d+$/,
    /^VPS:/,
    /^Cantidad/,
    /^Condición/,
    /^DNI:/,
    /^Ubicación:/,
    /^Domicilio:/,
    /^Razón social:/,
    /^Sleep/,
    /^JOSE LEON/,
    /^Au Cam/,
    /^Tel\./,
    /^Responsable/,
    /^R$/,
    /^Cod\./,
    /^Remito/,
    /^Original/,
    /^Nº:/,
    /^Fecha:/,
    /^CUIT:/,
    /^Ingresos/,
    /^Inicio/,
    /^Recibí/,
    /^Powered/,
    /^Cantidad\s+Código/,
  ];

  const seen = new Set<string>();
  const productList: string[] = [];
  let pastHeader = false;

  for (const line of lines) {
    // Empezar a capturar productos después de la línea de condición de IVA
    if (line.startsWith("Condición de IVA:")) {
      pastHeader = true;
      continue;
    }
    if (!pastHeader) continue;
    if (line.startsWith("Cantidad total:")) break;

    // Ignorar SKUs y patrones a saltar
    if (skuPattern.test(line)) continue;
    if (skipPatterns.some((p) => p.test(line))) continue;
    if (line.length < 4) continue;

    if (!seen.has(line)) {
      seen.add(line);
      productList.push(line);
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
      products: productList.join(", ") || undefined,
      source: "REMITO",
    },
  ];
}
