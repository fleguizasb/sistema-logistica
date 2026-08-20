/**
 * Extractor para remitos (documentos de envío genéricos).
 *
 * Los remitos tienen formatos variados entre empresas. Este extractor
 * implementa heurísticas generales que funcionan para los formatos más comunes.
 *
 * Si una empresa tiene un formato de remito muy específico, se puede crear
 * un extractor dedicado (ej: RemitoOCAExtractor, RemitoAndreaniExtractor).
 */

import type { PdfExtractor, ExtractedShipment } from "./types";

export class RemitoExtractor implements PdfExtractor {
  readonly name = "REMITO";

  detect(rawText: string): boolean {
    const normalized = rawText.toLowerCase();
    return (
      normalized.includes("remito") ||
      normalized.includes("orden de despacho") ||
      normalized.includes("guía de envío") ||
      normalized.includes("nota de entrega") ||
      // Número de remito: "R-0001-00012345" o "N° 0001-00012345"
      /r[-\s]?\d{4}[-\s]?\d{8}/i.test(rawText)
    );
  }

  extract(rawText: string): ExtractedShipment {
    const result: ExtractedShipment = {};

    // Número de remito
    const remitoMatch = rawText.match(/(?:remito|nro?\.?|n[°º]\.?)[:\s]*([R\d][\d\-]{4,20})/i);
    if (remitoMatch) result.orderNumber = remitoMatch[1].trim();

    // Destinatario (varios formatos posibles)
    const nameMatch = rawText.match(
      /(?:destinatario|cliente|señor(?:es)?|sr\.?|sra\.?|a\s+cargo\s+de)[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,60}?)(?:\n|cuit|dni|tel|cel|dir|$)/i
    );
    if (nameMatch) result.recipientName = nameMatch[1].trim();

    // Teléfono
    const phoneMatch = rawText.match(
      /(?:tel[eé]fono|tel|cel|cel\.?|te)[:\.\s]*([+\d\s\(\)\-]{8,20})/i
    );
    if (phoneMatch) result.recipientPhone = phoneMatch[1].trim();

    // Domicilio de entrega
    const addressMatch = rawText.match(
      /(?:domicilio|direcci[oó]n|entrega|despachar\s+a)[:\s]+([^\n]{5,100})/i
    );
    if (addressMatch) result.addressLine = addressMatch[1].trim();

    // Ciudad
    const cityMatch = rawText.match(
      /(?:ciudad|localidad|partido|pdo\.?)[:\s]*([^\n,]{2,50})/i
    );
    if (cityMatch) result.city = cityMatch[1].trim();

    // Provincia
    const provinceMatch = rawText.match(
      /(?:provincia|prov\.?)[:\s]*([^\n,]{2,30})/i
    );
    if (provinceMatch) result.province = provinceMatch[1].trim();

    // CP
    const cpMatch = rawText.match(
      /(?:cp|c\.p\.|código\s*postal)[:\.\s]*([A-Z]?\d{4}[A-Z]{0,3})/i
    );
    if (cpMatch) result.postalCode = cpMatch[1].trim();

    // Descripción de artículos
    const itemsMatch = rawText.match(
      /(?:descripci[oó]n|detalle|mercader[ií]a|art[ií]culos?)[:\s\n]+([\s\S]{5,400}?)(?:\n\n|total|bultos|peso|$)/i
    );
    if (itemsMatch) result.products = itemsMatch[1].trim().replace(/\n/g, " | ");

    // Observaciones
    const notesMatch = rawText.match(
      /(?:observaciones|notas?|instrucciones)[:\s]+([^\n]{3,200})/i
    );
    if (notesMatch) result.notes = notesMatch[1].trim();

    return result;
  }
}
