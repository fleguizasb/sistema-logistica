import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShipmentStatus } from "@prisma/client";
import { AssignmentsList } from "@/components/driver/assignments-list";

export const metadata = { title: "Mis Pedidos — Sistema Logístico" };

export default async function AssignmentsPage() {
  const session = await auth();

  // Cargar envíos LISTO_PARA_ENVIAR (todos) + EN_CAMINO (asignados a este chofer)
  const shipments = await prisma.shipment.findMany({
    where: {
      OR: [
        { status: ShipmentStatus.LISTO_PARA_ENVIAR },
        {
          status: ShipmentStatus.EN_CAMINO,
          assignedDriverId: session?.user?.id,
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      recipientName: true,
      addressLine: true,
      addressExtra: true,
      city: true,
      province: true,
      orderNumber: true,
      products: true,
      notes: true,
      recipientPhone: true,
    },
  });

  return <AssignmentsList shipments={shipments} />;
}
