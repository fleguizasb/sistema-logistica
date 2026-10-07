"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ShipmentSource } from "@prisma/client";

export async function createShipmentAsRequester(data: {
  orderNumber?: string;
  recipientName: string;
  recipientPhone?: string;
  addressLine: string;
  addressExtra?: string;
  city: string;
  province: string;
  postalCode?: string;
  products?: string;
  notes?: string;
}) {
  const session = await auth();

  if (!session?.user?.id) throw new Error("No autenticado");

  const role = session.user.role;
  if (role !== "SOLICITANTE" && role !== "MANAGER") {
    throw new Error("No autorizado");
  }

  // Validación mínima
  if (!data.recipientName?.trim()) throw new Error("El nombre del destinatario es obligatorio");
  if (!data.addressLine?.trim()) throw new Error("La dirección es obligatoria");
  if (!data.city?.trim()) throw new Error("La ciudad es obligatoria");
  if (!data.province?.trim()) throw new Error("La provincia es obligatoria");

  const shipment = await prisma.shipment.create({
    data: {
      orderNumber: data.orderNumber?.trim() || null,
      source: ShipmentSource.MANUAL,
      recipientName: data.recipientName.trim(),
      recipientPhone: data.recipientPhone?.trim() || null,
      addressLine: data.addressLine.trim(),
      addressExtra: data.addressExtra?.trim() || null,
      city: data.city.trim(),
      province: data.province.trim(),
      postalCode: data.postalCode?.trim() || null,
      products: data.products?.trim() || null,
      notes: data.notes?.trim() || null,
      createdById: session.user.id,
      // Si es solicitante, marcar como quien lo pidió
      requestedById: role === "SOLICITANTE" ? session.user.id : null,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/shipments");

  return shipment;
}
