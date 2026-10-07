"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ShipmentSource } from "@prisma/client";

// Busca la empresa logística que corresponde según reglas de ruteo.
// Prioridad: código postal > ciudad > provincia.
// Dentro de cada tipo, gana la regla con mayor `priority`.
async function resolveLogisticsCompany(params: {
  postalCode?: string;
  city?: string;
  province?: string;
}): Promise<string | null> {
  const rules = await prisma.routingRule.findMany({
    where: { active: true },
    orderBy: { priority: "desc" },
    include: { logisticsCompany: { select: { id: true, active: true } } },
  });

  for (const rule of rules) {
    if (!rule.logisticsCompany.active) continue;

    if (rule.type === "POSTAL_CODE" && params.postalCode) {
      if (params.postalCode.startsWith(rule.pattern)) {
        return rule.logisticsCompanyId;
      }
    }
    if (rule.type === "CITY" && params.city) {
      if (params.city.toLowerCase().includes(rule.pattern.toLowerCase())) {
        return rule.logisticsCompanyId;
      }
    }
    if (rule.type === "PROVINCE" && params.province) {
      if (params.province.toLowerCase().includes(rule.pattern.toLowerCase())) {
        return rule.logisticsCompanyId;
      }
    }
  }

  // Sin regla que coincida → buscar empresa interna como fallback
  const internal = await prisma.logisticsCompany.findFirst({
    where: { isInternal: true, active: true },
    select: { id: true },
  });
  return internal?.id ?? null;
}

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

  // Resolver empresa logística automáticamente por reglas de ruteo
  const logisticsCompanyId = await resolveLogisticsCompany({
    postalCode: data.postalCode?.trim(),
    city: data.city.trim(),
    province: data.province.trim(),
  });

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
      requestedById: role === "SOLICITANTE" ? session.user.id : null,
      logisticsCompanyId,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/shipments");

  return shipment;
}
