import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { detectAndExtract } from "@/lib/extractors";

export const runtime = "nodejs";

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

    // Usar require para evitar el bug del archivo de test de pdf-parse en Next.js
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse/lib/pdf-parse");
    const data = await pdfParse(buffer);
    const text: string = data.text;

    const result = detectAndExtract(text);

    // LOG TEMPORAL para debug — ver en Vercel Function Logs
    console.log("=== PDF RAW TEXT (primeros 3000 chars) ===");
    console.log(JSON.stringify(text.slice(0, 3000)));
    console.log("=== RESULT ===");
    console.log(JSON.stringify(result.shipments.map(s => ({ order: s.orderNumber, products: s.products }))));

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
    console.error("PDF extract error:", err);
    return NextResponse.json(
      { error: "Error al procesar el PDF. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
