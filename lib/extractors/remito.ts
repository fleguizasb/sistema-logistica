/**
 * Extractor de remitos (formato Contabilium/SleepBox).
 *
 * Estructura real del PDF según pdf-parse:
 *   - Los datos del cliente están en campos etiquetados: "Razón social:", "Domicilio:", "Ubicación:"
 *   - La tabla de productos tiene tres columnas (Cantidad | Código | Descripción)
 *     que pdf-parse lineariza así:
 *       qty_1
 *       SKU_1
 *       Descripción_1 + qty_2 (pegados al final)
 *       SKU_1  ← segunda lectura del mismo SKU (artefacto PDF)
 *       Descripción_1  ← limpia
 *       qty_2
 *       SKU_2
 *       Descripción_2
 *       ...
 *   - Estrategia: ancla por SKU (patrón /^[A-Z]{2,}[-_][\w-]+$/),
 *     prevLine = qty, nextLine = descripción (se le quitan dígitos finales).
 *     Se ignoran SKUs duplicados con seenSkus.
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

    const telMatch = domText.match(/\.?\s*Tel:\s*([+\d\s\-]+)/i);
    if (telMatch) recipientPhone = telMatch[1].trim();

    // Dirección: todo antes de "- CP" o ". Tel:"
    addressLine = domText
      .split(/\s*-\s*CP\s*\d+/i)[0]
      .split(/\s*\.?\s*Tel:/i)[0]
      .trim();
  }

  // ── Ciudad y Provincia ────────────────────────────────────────────────────────
  // Formato: "Ubicación: BELLA VISTA, Buenos AiresDNI: 20372784130"
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
  // Localizar el inicio de la sección de productos (después de "Condición de IVA:")
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
    const productText = endIdx !== undefined
      ? productSection.slice(0, endIdx)
      : productSection;

    // Ancla por SKU: patrón "DOS_O_MAS_MAYUSCULAS-ALFANUMERICO"
    const skuPattern = /^[A-Z]{2,}[-_][\w-]+$/;
    const lines = productText.split("\n").map((l) => l.trim());
    const seenSkus = new Set<string>();
    const productItems: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!skuPattern.test(line)) continue;
      if (seenSkus.has(line)) continue;
      seenSkus.add(line);

      const sku = line;

      // Descripción: línea SIGUIENTE al SKU, quitando dígitos pegados al final
      const rawDesc = i < lines.length - 1 ? lines[i + 1].trim() : "";
      const desc = rawDesc
        .replace(/\d+$/, "")  // quitar qty de otro producto pegado al final
        .trim();

      // Cantidad: línea ANTERIOR al SKU (si es un entero razonable)
      let qty = 1;
      const prevRaw = i > 0 ? lines[i - 1].trim() : "";
      if (/^\d+$/.test(prevRaw)) {
        const n = parseInt(prevRaw, 10);
        if (n >= 1 && n <= 99) qty = n;
      }

      const skuField = qty > 1 ? `SKU: ${sku}, qty: ${qty}` : `SKU: ${sku}`;
      const entry = desc ? `${desc} (${skuField})` : `(${skuField})`;
      productItems.push(entry);
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
