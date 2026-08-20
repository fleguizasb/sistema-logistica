/**
 * Tipos compartidos para el sistema de extractores de PDF.
 * Cada extractor debe implementar la interfaz PdfExtractor.
 */

export type ExtractionConfidence = "high" | "partial" | "none";

/**
 * Datos extraídos de un PDF de pedido.
 * Todos los campos son opcionales porque la extracción puede ser incompleta.
 * La UI de revisión permite al Gestor completar o corregir cualquier campo.
 */
export interface ExtractedShipment {
  orderNumber?: string;
  recipientName?: string;
  recipientPhone?: string;
  addressLine?: string;
  addressExtra?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  products?: string;
  notes?: string;
}

/**
 * Resultado de la extracción de un PDF.
 */
export interface ExtractionResult {
  /** Datos extraídos (parciales o completos) */
  data: ExtractedShipment;
  /** Confianza de la extracción */
  confidence: ExtractionConfidence;
  /** Formato detectado del PDF */
  detectedFormat: "TIENDANUBE" | "REMITO" | "UNKNOWN";
  /** Texto bruto extraído (para auditoría y depuración) */
  rawText: string;
  /** Campos que no pudieron extraerse */
  missingFields: (keyof ExtractedShipment)[];
}

/**
 * Interfaz que todo extractor de PDF debe implementar.
 * Permite agregar nuevos formatos sin modificar el resto del sistema.
 */
export interface PdfExtractor {
  /** Nombre identificador del extractor */
  readonly name: string;
  /**
   * Detecta si el texto del PDF corresponde a este formato.
   * Se usa para seleccionar automáticamente el extractor correcto.
   */
  detect(rawText: string): boolean;
  /**
   * Extrae los datos del PDF a partir del texto crudo.
   */
  extract(rawText: string): ExtractedShipment;
}
