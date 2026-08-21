import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LabelPrint } from "@/components/manager/shipments/label-print";

export const metadata = { title: "Etiquetas — Logística SleepBox" };

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: { ids?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Parsear formato "id1:qty1,id2:qty2" (retrocompatible con "id1,id2" sin qty)
  const rawItems = (searchParams.ids ?? "")
    .split(",")
    .filter(Boolean)
    .map((raw) => {
      const [id, qtyStr] = raw.split(":");
      const qty = Math.max(1, parseInt(qtyStr ?? "1") || 1);
      return { id, qty };
    });

  if (rawItems.length === 0) redirect("/shipments");

  const uniqueIds = [...new Set(rawItems.map((i) => i.id))];

  const baseShipments = await prisma.shipment.findMany({
    where: { id: { in: uniqueIds } },
    orderBy: { createdAt: "asc" },
  });

  if (baseShipments.length === 0) redirect("/shipments");

  // Expandir: un envío con qty:3 genera 3 entradas (una etiqueta por entrada)
  const shipments = rawItems.flatMap(({ id, qty }) => {
    const s = baseShipments.find((b) => b.id === id);
    return s ? Array.from({ length: qty }, () => s) : [];
  });

  return <LabelPrint shipments={shipments} />;
}
