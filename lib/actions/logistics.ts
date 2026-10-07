"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { RuleType } from "@prisma/client";

// ─── Empresas logísticas ─────────────────────────────────────────────────────

export async function getLogisticsCompanies() {
  return prisma.logisticsCompany.findMany({
    where: { active: true },
    orderBy: [{ isInternal: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { shipments: true, routingRules: true } },
    },
  });
}

export async function createLogisticsCompany(data: {
  name: string;
  isInternal: boolean;
  website?: string;
  trackingUrlTemplate?: string;
  notes?: string;
}) {
  const session = await auth();
  if (session?.user?.role !== "MANAGER") throw new Error("No autorizado");

  const company = await prisma.logisticsCompany.create({ data });
  revalidatePath("/logistics");
  return company;
}

export async function updateLogisticsCompany(
  id: string,
  data: {
    name?: string;
    isInternal?: boolean;
    active?: boolean;
    website?: string;
    trackingUrlTemplate?: string;
    notes?: string;
  }
) {
  const session = await auth();
  if (session?.user?.role !== "MANAGER") throw new Error("No autorizado");

  const company = await prisma.logisticsCompany.update({ where: { id }, data });
  revalidatePath("/logistics");
  return company;
}

export async function deleteLogisticsCompany(id: string) {
  const session = await auth();
  if (session?.user?.role !== "MANAGER") throw new Error("No autorizado");

  // Verificar que no haya envíos asignados activos
  const activeShipments = await prisma.shipment.count({
    where: {
      logisticsCompanyId: id,
      status: {
        notIn: ["ENTREGADO", "CANCELADO"],
      },
    },
  });

  if (activeShipments > 0) {
    throw new Error(
      `No se puede eliminar: hay ${activeShipments} envío(s) activo(s) asignado(s) a esta empresa`
    );
  }

  // Eliminar reglas de ruteo y luego la empresa
  await prisma.routingRule.deleteMany({ where: { logisticsCompanyId: id } });
  await prisma.logisticsCompany.delete({ where: { id } });
  revalidatePath("/logistics");
}

// ─── Reglas de ruteo ─────────────────────────────────────────────────────────

export async function getRoutingRules() {
  return prisma.routingRule.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: { logisticsCompany: { select: { name: true, isInternal: true } } },
  });
}

export async function createRoutingRule(data: {
  logisticsCompanyId: string;
  type: RuleType;
  pattern: string;
  priority: number;
  notes?: string;
}) {
  const session = await auth();
  if (session?.user?.role !== "MANAGER") throw new Error("No autorizado");

  const rule = await prisma.routingRule.create({ data });
  revalidatePath("/logistics");
  return rule;
}

export async function updateRoutingRule(
  id: string,
  data: {
    active?: boolean;
    priority?: number;
    pattern?: string;
    notes?: string;
  }
) {
  const session = await auth();
  if (session?.user?.role !== "MANAGER") throw new Error("No autorizado");

  const rule = await prisma.routingRule.update({ where: { id }, data });
  revalidatePath("/logistics");
  return rule;
}

export async function deleteRoutingRule(id: string) {
  const session = await auth();
  if (session?.user?.role !== "MANAGER") throw new Error("No autorizado");

  await prisma.routingRule.delete({ where: { id } });
  revalidatePath("/logistics");
}

// ─── Sugerencia de empresa por código postal / provincia ─────────────────────

export async function suggestLogisticsCompany(params: {
  postalCode?: string;
  province?: string;
  city?: string;
}): Promise<{ id: string; name: string } | null> {
  const rules = await prisma.routingRule.findMany({
    where: { active: true },
    orderBy: { priority: "desc" },
    include: { logisticsCompany: true },
  });

  for (const rule of rules) {
    if (!rule.logisticsCompany.active) continue;

    if (rule.type === "POSTAL_CODE" && params.postalCode) {
      if (params.postalCode.startsWith(rule.pattern)) {
        return { id: rule.logisticsCompanyId, name: rule.logisticsCompany.name };
      }
    }

    if (rule.type === "PROVINCE" && params.province) {
      if (
        params.province.toLowerCase().includes(rule.pattern.toLowerCase())
      ) {
        return { id: rule.logisticsCompanyId, name: rule.logisticsCompany.name };
      }
    }

    if (rule.type === "CITY" && params.city) {
      if (params.city.toLowerCase().includes(rule.pattern.toLowerCase())) {
        return { id: rule.logisticsCompanyId, name: rule.logisticsCompany.name };
      }
    }
  }

  return null;
}

// ─── Asignar logística a un envío ────────────────────────────────────────────

export async function assignLogisticsToShipment(
  shipmentId: string,
  data: {
    logisticsCompanyId: string | null;
    externalTrackingCode?: string;
    externalTrackingUrl?: string;
  }
) {
  const session = await auth();
  if (session?.user?.role !== "MANAGER") throw new Error("No autorizado");

  // Si hay template en la empresa y hay código, generar URL automáticamente
  let trackingUrl = data.externalTrackingUrl;

  if (data.logisticsCompanyId && data.externalTrackingCode && !trackingUrl) {
    const company = await prisma.logisticsCompany.findUnique({
      where: { id: data.logisticsCompanyId },
    });
    if (company?.trackingUrlTemplate && data.externalTrackingCode) {
      trackingUrl = company.trackingUrlTemplate.replace(
        "{code}",
        data.externalTrackingCode
      );
    }
  }

  const shipment = await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      logisticsCompanyId: data.logisticsCompanyId,
      externalTrackingCode: data.externalTrackingCode ?? null,
      externalTrackingUrl: trackingUrl ?? null,
    },
    include: {
      logisticsCompany: { select: { name: true } },
    },
  });

  revalidatePath(`/shipments/${shipmentId}`);
  revalidatePath("/shipments");
  return shipment;
}
