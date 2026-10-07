"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ShipmentSource } from "@prisma/client";

// Prefijos de SKU que van con Procourrier (si el código postal está en su zona)
const PROCOURRIER_SKU_PREFIXES = ["ASB", "CSB", "CCA", "CPI", "ESB", "FSB", "PSB", "SSB", "TCH", "TDA"];

// Detecta si algún producto en el string tiene prefijo de Procourrier.
// Soporta formatos: "ASB-XXX", "Nombre (SKU: ASB-XXX)", lista con comas, etc.
function hasProcouirrierSku(products?: string | null): boolean {
  if (!products) return false;
  const upper = products.toUpperCase();
  return PROCOURRIER_SKU_PREFIXES.some((prefix) =>
    new RegExp(`(?:^|[\\s,;(|])${prefix}[-_]`).test(upper)
  );
}

// Resuelve qué empresa logística corresponde a un pedido.
// Lógica en orden de prioridad:
//   1. SKU Procourrier + código postal en zona Procourrier → Procourrier
//   2. SKU distinto   + código postal en zona Flota Propia → Flota Propia
//   3. Default                                             → Enviopack
async function resolveLogisticsCompany(params: {
  postalCode?: string;
  city?: string;
  province?: string;
  products?: string | null;
}): Promise<string | null> {
  const isProcouirrierSku = hasProcouirrierSku(params.products);

  if (params.postalCode) {
    // Traer todas las reglas de código postal de una sola query
    const rules = await prisma.routingRule.findMany({
      where: { active: true, type: "POSTAL_CODE" },
      orderBy: { priority: "desc" },
      include: {
        logisticsCompany: { select: { id: true, name: true, active: true } },
      },
    });

    const matched = rules.filter(
      (r) => r.logisticsCompany.active && params.postalCode!.startsWith(r.pattern)
    );

    if (isProcouirrierSku) {
      // Condición 1: SKU Procourrier + CP en zona Procourrier
      const rule = matched.find((r) => r.logisticsCompany.name === "Procourrier");
      if (rule) return rule.logisticsCompanyId;
    } else {
      // Condición 2: SKU distinto + CP en zona Flota Propia
      const rule = matched.find((r) => r.logisticsCompany.name === "Flota Propia");
      if (rule) return rule.logisticsCompanyId;
    }
  }

  // Default: Enviopack
  const enviopack = await prisma.logisticsCompany.findFirst({
    where: { name: "Enviopack", active: true },
    select: { id: true },
  });
  return enviopack?.id ?? null;
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

  // Resolver empresa logística automáticamente
  const logisticsCompanyId = await resolveLogisticsCompany({
    postalCode: data.postalCode?.trim(),
    city: data.city.trim(),
    province: data.province.trim(),
    products: data.products?.trim() || null,
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
