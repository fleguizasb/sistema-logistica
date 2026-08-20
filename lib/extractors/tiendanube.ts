/**
 * Extractor de etiquetas de Tienda Nube.
 * El PDF puede contener múltiples órdenes en una sola página.
 *
 * Estructura de cada orden en el texto extraído:
 *   Orden #XXXX - Paquete #X
 *   Realizada el DD/MM/YYYY
 *   Producto
 *   [nombre producto]
 *   SKU: XXX
 *   ...
 *   Subtotal (N unidades)
 *   Medio de pago: ...
 *   Envío: ...
 *   [Notas del cliente:\n texto...]
 *   Enviar a:
 *   [nombre destinatario]
 *   [Cant. / números de cantidad — artefactos del layout PDF]
 *   Teléfono: +XXXXXXXXX
 *   DNI: XXXXXXXX
 *   [dirección línea 1]
 *   [dirección extra opcional]
 *   Ciudad, Provincia, CodigoPostal
 *   Argentina
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

function parseOrderBlock(block: string): ExtractedShipment | null {
  // ── Número de orden ──────────────────────────────────────────────────────────
  const orderMatch = block.match(/Orden #(\d+)/);
  if (!orderMatch) return null;
  const orderNumber = orderMatch[1];

  // ── Productos (antes de Subtotal) ─────────────────────────────────────────────
  let products: string | undefined;
  const productoMatch = block.match(/Producto\n([\s\S]*?)Subtotal/);
  if (productoMatch) {
    const productLines = productoMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("SKU:") && !l.match(/^\d+$/) && l !== "Cant.");
    if (productLines.length) products = productLines.join(", ");
  }

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
