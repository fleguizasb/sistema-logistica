/**
 * Orquestador de extractores de PDF.
 *
 * Responsabilidades:
 * 1. Extraer texto del PDF (con pdf-parse)
 * 2. Detectar el formato del PDF
 * 3. Delegar al extractor correcto
 * 4. Retornar el resultado con metadatos de confianza
 *
 * Para agregar un nuevo formato:
 *   1. Crear el extractor en lib/extractors/mi-formato.ts
 *   2. Importarlo y agregarlo al array EXTRACTORS abajo
 *   ✅ No hay que tocar ningún otro archivo
 */

import type { ExtractionResult, ExtractedShipment, PdfExtractor } from "./types";
import { TiendaNubeExtractor } from "./tiendanube";
import { RemitoExtractor } from "./remito";

// Registro de extractores disponibles — orden importa (primero detectado gana)
const EXTRACTORS: PdfExtractor[] = [
  new TiendaNubeExtractor(),
  new RemitoExtractor(),
];

/**
 * Campos obligatorios para considerar la extracción como "alta confianza".
 */
const REQUIRED_FIELDS: (keyof ExtractedShipment)[] = [
  "recipientName",
  "addressLine",
  "city",
  "province",
];

/**
 * Extrae los datos de un Buffer de PDF.
 * Nunca lanza excepciones — retorna confidence: "none" si algo falla.
 */
export async function extractFromPdf(pdfBuffer: Buffer): Promise<ExtractionResult> {
  let rawText = "";

  try {
    // pdf-parse se importa dinámicamente para evitar problemas con Next.js edge runtime
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(pdfBuffer);
    rawText = parsed.text;
  } catch (error) {
    console.error("Error al leer el PDF:", error);
    return {
      data: {},
      confidence: "none",
      detectedFormat: "UNKNOWN",
      rawText: "",
      missingFields: REQUIRED_FIELDS,
    };
  }

  // Detectar el formato
  const matchedExtractor = EXTRACTORS.find((e) => e.detect(rawText));

  if (!matchedExtractor) {
    return {
      data: {},
      confidence: "none",
      detectedFormat: "UNKNOWN",
      rawText,
      missingFields: REQUIRED_FIELDS,
    };
  }

  // Extraer datos
  const data = matchedExtractor.extract(rawText);

  // Calcular campos faltantes y confianza
  const missingFields = REQUIRED_FIELDS.filter(
    (f) => !data[f] || String(data[f]).trim() === ""
  );

  let confidence: ExtractionResult["confidence"];
  if (missingFields.length === 0) {
    confidence = "high";
  } else if (missingFields.length < REQUIRED_FIELDS.length) {
    confidence = "partial";
  } else {
    confidence = "none";
  }

  return {
    data,
    confidence,
    detectedFormat:
      matchedExtractor.name === "TIENDANUBE"
        ? "TIENDANUBE"
        : matchedExtractor.name === "REMITO"
        ? "REMITO"
        : "UNKNOWN",
    rawText,
    missingFields,
  };
}
