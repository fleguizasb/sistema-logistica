import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ShipmentDetail } from "@/components/driver/shipment-detail";

export const metadata = { title: "Detalle del pedido — Sistema Logístico" };

interface Props {
  params: { id: string };
}

export default async function AssignmentDetailPage({ params }: Props) {
  const session = await auth();

  const shipment = await prisma.shipment.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      status: true,
      recipientName: true,
      recipientPhone: true,
      addressLine: true,
      addressExtra: true,
      city: true,
      province: true,
      postalCode: true,
      orderNumber: true,
      products: true,
      notes: true,
      source: true,
      assignedDriverId: true,
      events: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          toStatus: true,
          notes: true,
          createdAt: true,
          createdBy: { select: { name: true } },
        },
      },
    },
  });

  if (!shipment) notFound();

  // El chofer solo puede operar envíos que le están asignados (EN_CAMINO)
  // o que están LISTO_PARA_ENVIAR (visibles a todos)
  const canOperate =
    shipment.status === "EN_CAMINO" &&
    (shipment.assignedDriverId === session?.user?.id ||
      session?.user?.role === "MANAGER");

  return <ShipmentDetail shipment={shipment} canOperate={canOperate} />;
}
