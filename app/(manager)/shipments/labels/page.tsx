import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LabelPrint } from "@/components/manager/shipments/label-print";
import { Printer, Package, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Etiquetas — Logística SleepBox" };

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: { ids?: string; qty?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // ── Modo impresión: vienen ?ids=... ──────────────────────────────────────────

  if (searchParams.ids) {
    const ids = searchParams.ids.split(",").filter(Boolean);
    const qtyValues = (searchParams.qty ?? "")
      .split(",")
      .map((v) => parseInt(v, 10))
      .map((n) => (isNaN(n) || n < 1 ? 1 : Math.min(n, 10)));

    const uniqueIds = [...new Set(ids)];

    const shipments = await prisma.shipment.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        recipientName: true,
        recipientPhone: true,
        addressLine: true,
        addressExtra: true,
        city: true,
        province: true,
        postalCode: true,
        orderNumber: true,
        trackingToken: true,
        products: true,
      },
    });

    // Construir initialCopies: qty[i] corresponde a ids[i] (en orden de uniqueIds)
    const initialCopies: Record<string, number> = {};
    uniqueIds.forEach((id, i) => {
      initialCopies[id] = qtyValues[i] ?? 1;
    });

    // Ordenar según el orden original de ids (y deduplicar)
    const ordered = uniqueIds
      .map((id) => shipments.find((s) => s.id === id))
      .filter(Boolean) as typeof shipments;

    return <LabelPrint shipments={ordered} initialCopies={initialCopies} />;
  }

  // ── Modo historial (sin ids) ──────────────────────────────────────────────────

  const pendientes = await prisma.shipment.count({
    where: { status: "EN_PREPARACION" },
  });

  const batches = await prisma.labelBatch.findMany({
    orderBy: { generatedAt: "desc" },
    take: 30,
    include: {
      createdBy: { select: { name: true } },
      items: {
        include: {
          shipment: {
            select: { recipientName: true, orderNumber: true, status: true },
          },
        },
      },
    },
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Etiquetas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Historial de impresiones y lotes generados
            </p>
          </div>
          {pendientes > 0 && (
            <Link
              href="/shipments?status=EN_PREPARACION"
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 h-9 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              {pendientes} pendiente{pendientes > 1 ? "s" : ""} de imprimir
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Printer className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">Todavía no se generaron etiquetas.</p>
            <p className="text-xs text-gray-400 mt-1">
              Seleccioná envíos en la lista y hacé clic en "Generar etiquetas".
            </p>
            <Link href="/shipments" className="mt-4 text-sm text-blue-600 hover:underline font-medium">
              Ir a Envíos →
            </Link>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {batches.map((batch) => {
              const confirmed = batch.confirmedAt != null;
              return (
                <div key={batch.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${confirmed ? "bg-green-100" : "bg-amber-100"}`}>
                        {confirmed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Printer className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {batch.items.length}{" "}
                          {batch.items.length === 1 ? "etiqueta" : "etiquetas"}
                          {" · "}
                          <span className="font-normal text-gray-500">
                            por {batch.createdBy.name}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(batch.generatedAt).toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {confirmed && (
                            <span className="ml-2 text-green-600 font-medium">· Impresión confirmada</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {batch.items.map((item) => (
                      <span key={item.id} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        <Package className="w-3 h-3 text-gray-400" />
                        {item.shipment.recipientName}
                        {item.shipment.orderNumber && (
                          <span className="text-gray-400">#{item.shipment.orderNumber}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
