/**
 * Extractor de etiquetas de Tienda Nube.
 * El PDF puede contener múltiples órdenes en una sola página.
 *
 * Estructura real del PDF según pdf-parse (la librería usada por la app):
 *   - "Producto" y "Cant." se fusionan en una sola línea: "ProductoCant."
 *   - La cantidad de cada producto aparece en la línea INMEDIATA después de su SKU.
 *   - Ejemplo por bloque:
 *       "ProductoCant."
 *       "Nombre del producto"
 *       "SKU: CODIGO"
 *       "2"           ← cantidad del producto anterior
 *       "Nombre del producto 2"
 *       "SKU: CODIGO2"
 *       "1"           ← cantidad del producto anterior
 *
 * Estrategias de extracción de productos (en orden de prioridad):
 *   1. Ancla por SKU: busca "SKU:" y toma la línea anterior como nombre.
 *      La cantidad está en la línea siguiente al SKU (i+1).
 *      Formato de salida: "Nombre (SKU: CODIGO)" o "Nombre (SKU: CODIGO, qty: N)"
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
  // pdf-parse pone la cantidad en la línea inmediata SIGUIENTE al SKU.
  // No usar lines[i-2] (twoBack) porque ese número es la qty del producto ANTERIOR.
  const lines = headerSection.split("\n").map((l) => l.trim());
  const productItems: string[] = [];
  const seenSkus = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^SKU:/i.test(line)) continue;

    const sku = line.replace(/^SKU:\s*/i, "").trim();
    if (!sku || seenSkus.has(sku)) continue;

    // Nombre: línea anterior al SKU
    const prevLine = i > 0 ? lines[i - 1].trim() : "";
    const isProductName =
      prevLine.length > 2 &&
      !prevLine.match(/^\d+$/) &&
      !/^Cant\.?$/i.test(prevLine) &&
      !/^ProductoCant\.?$/i.test(prevLine) &&
      !/^Producto/i.test(prevLine) &&
      !/^Orden/i.test(prevLine) &&
      !/^Realizada/i.test(prevLine);

    // Cantidad: línea SIGUIENTE al SKU
    // En pdf-parse, la qty queda justo después del SKU en el texto linearizado.
    let qty = 1;
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : "";
    if (/^\d+$/.test(nextLine)) {
      const n = parseInt(nextLine, 10);
      if (n >= 1 && n <= 99) qty = n;
    }

    const skuField = qty > 1 ? `SKU: ${sku}, qty: ${qty}` : `SKU: ${sku}`;
    const entry = isProductName
      ? `${prevLine} (${skuField})`
      : `(${skuField})`;

    seenSkus.add(sku);
    productItems.push(entry);
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
  const fechaMatch = headerSection.match(
    /Realizada el[^\n]*\n([\s\S]*?)(?:subtotal|medio de pago|envío:)/i
  );
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

    if (line.startsWith("DNI:")) continue;
    if (line === "Cant." || line.match(/^\d+$/)) continue;
    if (line === "Argentina") break;

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
