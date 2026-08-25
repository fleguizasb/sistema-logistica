import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { detectAndExtract } from "@/lib/extractors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let text = "";

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

    // ── Paso 1: parsear PDF ────────────────────────────────────────────────────
    try {
      // Usar require para evitar el bug del archivo de test de pdf-parse en Next.js
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require("pdf-parse/lib/pdf-parse");
      const data = await pdfParse(buffer);
      text = data.text ?? "";
    } catch (parseErr: any) {
      const msg = parseErr?.message ?? String(parseErr);
      console.error("pdf-parse error:", parseErr);
      return NextResponse.json(
        { error: `Error leyendo el PDF: ${msg}` },
        { status: 500 }
      );
    }

    // ── Paso 2: detectar formato y extraer ─────────────────────────────────────
    let result;
    try {
      result = detectAndExtract(text);
    } catch (extractErr: any) {
      const msg = extractErr?.message ?? String(extractErr);
      console.error("Extraction error:", extractErr);
      return NextResponse.json(
        { error: `Error extrayendo datos: ${msg}` },
        { status: 500 }
      );
    }

    console.log("Detected format:", result.source);
    console.log("Shipments found:", result.shipments.length);

    if (result.source === "UNKNOWN" || result.shipments.length === 0) {
      // Mostrar los primeros 500 chars del texto para ayudar a diagnosticar
      const preview = text.slice(0, 500).replace(/\n/g, "↵");
      console.log("Unrecognized PDF text preview:", preview);
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
    const msg = err?.message ?? String(err);
    console.error("PDF extract unexpected error:", err);
    return NextResponse.json(
      { error: `Error inesperado: ${msg}` },
      { status: 500 }
    );
  }
}
