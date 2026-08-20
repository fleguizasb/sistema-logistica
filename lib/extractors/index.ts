import type { ExtractedShipment } from "./types";
import { extractTiendaNube } from "./tiendanube";
import { extractRemito } from "./remito";

export type { ExtractedShipment };

export type PdfSource = "TIENDANUBE" | "REMITO" | "UNKNOWN";

export interface ExtractionResult {
  source: PdfSource;
  shipments: ExtractedShipment[];
}

/**
 * Detecta automáticamente el formato del PDF y extrae los datos de envío.
 */
export function detectAndExtract(text: string): ExtractionResult {
  if (text.includes("Orden #") && text.includes("Enviar a:")) {
    return { source: "TIENDANUBE", shipments: extractTiendaNube(text) };
  }

  if (
    text.includes("Razón social:") &&
    text.includes("Domicilio:") &&
    text.includes("Ubicación:")
  ) {
    return { source: "REMITO", shipments: extractRemito(text) };
  }

  return { source: "UNKNOWN", shipments: [] };
}
