"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── Confirmar impresión de etiquetas ─────────────────────────────────────────
// Crea el LabelBatch, cambia el estado de los envíos a LISTO_PARA_ENVIAR
// y registra un evento por cada uno.

export async function confirmLabels(shipmentIds: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  if (shipmentIds.length === 0) throw new Error("No hay envíos seleccionados");

  // Obtener estado actual de cada envío para el fromStatus del evento
  const shipments = await prisma.shipment.findMany({
    where: { id: { in: shipmentIds } },
    select: { id: true, status: true },
  });

  // Crear el lote de etiquetas ya confirmado
  await prisma.labelBatch.create({
    data: {
      confirmedAt: new Date(),
      createdById: session.user.id,
      confirmedById: session.user.id,
      items: {
        create: shipmentIds.map((id) => ({ shipmentId: id })),
      },
    },
  });

  // Actualizar cada envío y crear su evento
  for (const s of shipments) {
    // Solo actualizar si no está ya en un estado posterior
    const skipStatuses = ["LISTO_PARA_ENVIAR", "ASIGNADO_CHOFER", "EN_CAMINO", "ENTREGADO"];
    if (skipStatuses.includes(s.status)) continue;

    await prisma.shipment.update({
      where: { id: s.id },
      data: {
        status: "LISTO_PARA_ENVIAR",
        events: {
          create: {
            fromStatus: s.status,
            toStatus: "LISTO_PARA_ENVIAR",
            notes: "Etiqueta impresa",
            createdById: session.user.id,
          },
        },
      },
    });
  }

  revalidatePath("/shipments");
  redirect("/shipments?status=LISTO_PARA_ENVIAR");
}
