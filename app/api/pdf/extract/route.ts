import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { detectAndExtract } from "@/lib/extractors";

export const runtime = "nodejs";

/**
 * Extrae texto de un buffer PDF con dos estrategias:
 * 1. pdf-parse (rápido, para PDFs bien formados)
 * 2. pdfjs-dist v3 en modo legacy/recovery (para PDFs con XRef malformada,
 *    como los remitos de Contabilium que dan "bad XRef entry")
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // ── Intento 1: pdf-parse ─────────────────────────────────────────────────────
  try {
    const pdfParse = require("pdf-parse/lib/pdf-parse");
    const data = await pdfParse(buffer);
    return data.text ?? "";
  } catch (firstErr: any) {
    console.warn("pdf-parse falló:", firstErr.message, "— usando pdfjs-dist con recovery");
  }

  // ── Intento 2: pdfjs-dist v3 legacy con stopAtErrors=false ──────────────────
  // pdfjs-dist v3 tiene mejor recovery de XRef corrupta que la v2 incluida
  // en pdf-parse. El build "legacy" funciona en Node.js sin Web Workers.
  const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc = ""; // deshabilitar workers en Node.js

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    stopAtErrors: false,    // continuar aunque haya errores en la estructura
    isEvalSupported: false, // sin eval() en Node
    useSystemFonts: true,
    disableFontFace: true,
  });

  const doc = await loadingTask.promise;

  // Reconstruir texto replicando el comportamiento de pdf-parse:
  // items con el mismo Y → misma línea, cambio de Y → salto de línea
  let fullText = "";
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    let lastY: number | null = null;
    for (const item of textContent.items as Array<{ str?: string; transform?: number[] }>) {
      if (!item.str || !item.transform) continue;
      const y = item.transform[5];
      if (lastY !== null && y !== lastY) {
        fullText += "\n";
      }
      fullText += item.str;
      lastY = y;
    }
    fullText += "\n";
  }

  return fullText;
}

// ── Handler principal ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se subió ningún archivo." },
        { status: 400 }
      );
    }

    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "El archivo debe ser un PDF." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Extraer texto (con fallback automático si pdf-parse falla)
    let text: string;
    try {
      text = await extractTextFromPdf(buffer);
    } catch (parseErr: any) {
      const msg = parseErr?.message ?? "error desconocido";
      console.error("Error leyendo el PDF:", parseErr);
      return NextResponse.json(
        {
          error: `No se pudo leer el PDF (${msg}). Intentá exportarlo o guardarlo de nuevo desde Contabilium.`,
        },
        { status: 422 }
      );
    }

    // Detectar formato y extraer datos de envío
    const result = detectAndExtract(text);

    if (result.source === "UNKNOWN" || result.shipments.length === 0) {
      return NextResponse.json(
        {
          error:
            "No se pudo reconocer el formato. Verificá que sea una etiqueta de Tienda Nube o un remito de Contabilium.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("PDF extract unexpected error:", err);
    return NextResponse.json(
      { error: "Error inesperado al procesar el PDF. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
