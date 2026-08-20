/**
 * Extractor de etiquetas de Tienda Nube.
 * El PDF puede contener múltiples órdenes en una sola página.
 *
 * Estrategias de extracción de productos (en orden de prioridad):
 *   1. Ancla por SKU: busca "SKU:" y toma la línea anterior como nombre
 *   2. Sección "Producto(s)": captura entre el header y Subtotal/Total
 *   3. Zona intermedia: todo entre la fecha y "Enviar a:", filtrando basura
 */

import type { ExtractedShipment } from "./types";

export function extractTiendaNube(text: string): ExtractedShipment[] {
  // Normalizar saltos de página
  const normalized = text.replace(/\x0c/g, "\n");

  // Dividir en bloques por orden
  const rawBlocks = normalized.split(/(?=Orden #\d+)/);

  const results: ExtractedShipment[] = [];

  for (const block of rawBlocks) {
    if (!block.trim() || !block.match(/Orden #\d+/)) continue;
    try {
      const s = parseOrderBlock(block);
      if (s) results.push(s);
    } catch (e) {
      console.error("Error parsing TiendaNube block:", e);
    }
  }

  return results;
}

function extractProducts(block: string): string | undefined {
  // Sección antes de "Enviar a:" es donde están los productos
  const enviarIdx = block.indexOf("Enviar a:");
  const headerSection = enviarIdx > -1 ? block.slice(0, enviarIdx) : block;

  // ── Estrategia 1: ancla por "SKU:" ─────────────────────────────────────────
  // TiendaNube siempre incluye "SKU: CODIGO" debajo del nombre del producto
  const lines = headerSection.split("\n").map((l) => l.trim());
  const productItems: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Buscar líneas que empiezan con "SKU:"
    if (/^SKU:/i.test(line)) {
      const sku = line.replace(/^SKU:\s*/i, "").trim();
      // La línea anterior debería ser el nombre del producto
      const prevLine = i > 0 ? lines[i - 1].trim() : "";
      const isProductName =
        prevLine.length > 2 &&
        !prevLine.match(/^\d+$/) &&
        !prevLine.match(/^Cant\.?$/i) &&
        !prevLine.match(/^Producto/i) &&
        !prevLine.match(/^Orden/i) &&
        !prevLine.match(/^Realizada/i);

      const entry = isProductName
        ? `${prevLine} (SKU: ${sku})`
        : `SKU: ${sku}`;

      if (!seen.has(entry)) {
        seen.add(entry);
        productItems.push(entry);
      }
    }
  }

  if (productItems.length > 0) return productItems.join("\n");

  // ── Estrategia 2: sección "Producto(s)" → Subtotal/Total ───────────────────
  const productoMatch = headerSection.match(
    /Productos?\s*\n+([\s\S]*?)(?:subtotal|total de\s+compra|\bTotal\b)/i
  );
  if (productoMatch) {
    const productLines = productoMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          l &&
          !l.match(/^\d+(\.\d+)?$/) &&
          !/^Cant\.?$/i.test(l) &&
          !/^Medio de pago/i.test(l) &&
          !/^Envío:/i.test(l)
      );
    if (productLines.length > 0) return productLines.join("\n");
  }

  // ── Estrategia 3: zona entre fecha y subtotal, filtrar basura ──────────────
  const fechaMatch = headerSection.match(/Realizada el[^\n]*\n([\s\S]*?)(?:subtotal|medio de pago|envío:)/i);
  if (fechaMatch) {
    const zone = fechaMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 3 &&
          !l.match(/^\d+(\.\d+)?$/) &&
          !/^Cant\.?$/i.test(l) &&
          !/^Producto$/i.test(l) &&
          !/^Subtotal/i.test(l) &&
          !/^Medio de pago/i.test(l) &&
          !/^Envío:/i.test(l)
      );
    if (zone.length > 0) return zone.join("\n");
  }

  return undefined;
}

function parseOrderBlock(block: string): ExtractedShipment | null {
  // ── Número de orden ──────────────────────────────────────────────────────────
  const orderMatch = block.match(/Orden #(\d+)/);
  if (!orderMatch) return null;
  const orderNumber = orderMatch[1];

  // ── Productos ─────────────────────────────────────────────────────────────────
  const products = extractProducts(block);

  // ── Notas del cliente ─────────────────────────────────────────────────────────
  let notes: string | undefined;
  const notasMatch = block.match(/Notas del cliente:\n([\s\S]*?)(?:\nEnviar a:)/);
  if (notasMatch) {
    const n = notasMatch[1].trim();
    if (n) notes = n;
  }

  // ── Sección "Enviar a:" ───────────────────────────────────────────────────────
  const enviarIdx = block.indexOf("Enviar a:");
  if (enviarIdx === -1) return null;

  const afterEnviar = block.slice(enviarIdx + "Enviar a:".length);

  // Todas las líneas no vacías de la sección de entrega
  const deliveryLines = afterEnviar
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

  // ── Nombre del destinatario ───────────────────────────────────────────────────
  // Primer token que no sea número ni "Cant."
  let recipientName = "";
  let nameIdx = 0;
  for (let i = 0; i < deliveryLines.length; i++) {
    const line = deliveryLines[i];
    if (line !== "Cant." && !line.match(/^\d+$/)) {
      recipientName = line;
      nameIdx = i;
      break;
    }
  }
  if (!recipientName) return null;

  // ── Teléfono ──────────────────────────────────────────────────────────────────
  let recipientPhone: string | undefined;
  let phoneIdx = -1;
  for (let i = nameIdx + 1; i < deliveryLines.length; i++) {
    if (deliveryLines[i].startsWith("Teléfono:")) {
      recipientPhone = deliveryLines[i].replace("Teléfono:", "").trim();
      phoneIdx = i;
      break;
    }
  }

  // ── Dirección ─────────────────────────────────────────────────────────────────
  const startIdx = phoneIdx !== -1 ? phoneIdx + 1 : nameIdx + 1;
  const addressLines: string[] = [];
  let cityLine: string | undefined;

  for (let i = startIdx; i < deliveryLines.length; i++) {
    const line = deliveryLines[i];

    // Ignorar artefactos del PDF
    if (line.startsWith("DNI:")) continue;
    if (line === "Cant." || line.match(/^\d+$/)) continue;

    // Fin de sección
    if (line === "Argentina") break;

    // Línea de ciudad/provincia/CP: "Ciudad, Provincia, XXXXX"
    if (line.match(/^.+,\s*.+,\s*\d{3,5}\s*$/)) {
      cityLine = line;
      break;
    }

    addressLines.push(line);
  }

  const addressLine = addressLines[0] || "";
  const addressExtra = addressLines.slice(1).join(", ") || undefined;

  // ── Parsear ciudad, provincia, CP ────────────────────────────────────────────
  let city = "";
  let province = "";
  let postalCode: string | undefined;

  if (cityLine) {
    const parts = cityLine.split(",").map((p) => p.trim());
    city = parts[0] ?? "";
    province = parts[1] ?? "";
    postalCode = parts[2] ?? undefined;
  }

  return {
    orderNumber,
    recipientName,
    recipientPhone,
    addressLine,
    addressExtra,
    city,
    province,
    postalCode,
    products,
    notes,
    source: "TIENDANUBE",
  };
}
