/**
 * Extractor para etiquetas de envío de Tienda Nube.
 *
 * Los PDFs de Tienda Nube tienen un formato consistente con campos
 * bien identificables. Este extractor usa regex calibradas para ese formato.
 *
 * IMPORTANTE: Los patrones deben ser validados contra PDFs reales de Tienda Nube
 * y ajustados si el formato cambia. Ver tests en __tests__/extractors/tiendanube.test.ts
 */

import type { PdfExtractor, ExtractedShipment } from "./types";

export class TiendaNubeExtractor implements PdfExtractor {
  readonly name = "TIENDANUBE";

  /**
   * Detecta si el PDF es una etiqueta de Tienda Nube.
   * Busca patrones de texto característicos del formato.
   */
  detect(rawText: string): boolean {
    const normalized = rawText.toLowerCase();
    return (
      normalized.includes("tiendanube") ||
      normalized.includes("tienda nube") ||
      normalized.includes("nube shops") ||
      // El número de pedido de Tienda Nube suele tener el formato #XXXXX
      /pedido\s*#\d{4,}/i.test(rawText)
    );
  }

  extract(rawText: string): ExtractedShipment {
    const result: ExtractedShipment = {};

    // Número de pedido: "#12345" o "Pedido #12345"
    const orderMatch = rawText.match(/(?:pedido\s*)?#(\d{4,})/i);
    if (orderMatch) result.orderNumber = orderMatch[1];

    // Nombre del destinatario: suele estar después de "Destinatario:" o "Para:"
    const nameMatch = rawText.match(
      /(?:destinatario|para|nombre)[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,50}?)(?:\n|telefono|tel|cel|email|$)/i
    );
    if (nameMatch) result.recipientName = nameMatch[1].trim();

    // Teléfono: formatos argentinos típicos
    const phoneMatch = rawText.match(
      /(?:tel[eé]fono|tel|cel)[:\s]*([+\d\s\(\)\-]{8,20})/i
    );
    if (phoneMatch) result.recipientPhone = phoneMatch[1].trim().replace(/\s+/g, " ");

    // Dirección: calle y número
    const addressMatch = rawText.match(
      /(?:direcci[oó]n|domicilio|enviar\s+a)[:\s]+([^\n]{5,80})/i
    );
    if (addressMatch) result.addressLine = addressMatch[1].trim();

    // Ciudad y provincia (suelen estar en la misma línea "Ciudad, Provincia")
    const locationMatch = rawText.match(
      /(?:ciudad|localidad)[:\s]*([^\n,]{2,50})(?:[,\n]\s*)?([^\n]{2,50})?/i
    );
    if (locationMatch) {
      result.city = locationMatch[1]?.trim();
      if (locationMatch[2]) result.province = locationMatch[2]?.trim();
    }

    // Código postal: 4 dígitos (Argentina) o formato CABA (C1234XXX)
    const cpMatch = rawText.match(/(?:cp|c\.p\.|código\s+postal)[:\s]*([A-Z]?\d{4}[A-Z]{0,3})/i);
    if (cpMatch) result.postalCode = cpMatch[1].trim();

    // Productos: líneas después de "Productos:" o "Artículos:"
    const productsMatch = rawText.match(
      /(?:productos|artículos|items)[:\s\n]+([\s\S]{5,300}?)(?:\n\n|subtotal|total|envío|$)/i
    );
    if (productsMatch) result.products = productsMatch[1].trim().replace(/\n/g, ", ");

    return result;
  }
}
