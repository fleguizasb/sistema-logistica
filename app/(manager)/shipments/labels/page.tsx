import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LabelPrint } from "@/components/manager/shipments/label-print";

export const metadata = { title: "Imprimir etiquetas — Sistema Logístico" };

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: { ids?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ids = (searchParams.ids ?? "").split(",").filter(Boolean);
  if (ids.length === 0) redirect("/shipments");

  const shipments = await prisma.shipment.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "asc" },
  });

  if (shipments.length === 0) redirect("/shipments");

  return <LabelPrint shipments={shipments} />;
}
