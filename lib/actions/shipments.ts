"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ShipmentStatus } from "@prisma/client";
import { isValidTransition } from "@/lib/constants/shipment-status";

// ─── Listar envíos ────────────────────────────────────────────────────────────

export async function getShipments(status?: ShipmentStatus | "ALL") {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const where = status && status !== "ALL" ? { status } : {};

  return prisma.shipment.findMany({
    where,
    include: {
      assignedDriver: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Detalle de un envío ──────────────────────────────────────────────────────

export async function getShipmentById(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  return prisma.shipment.findUnique({
    where: { id },
    include: {
      assignedDriver: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      events: {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ─── Crear envío manual ───────────────────────────────────────────────────────

export async function createShipment(data: {
  recipientName: string;
  recipientPhone?: string;
  addressLine: string;
  addressExtra?: string;
  city: string;
  province: string;
  postalCode?: string;
  products?: string;
  notes?: string;
  orderNumber?: string;
  /** Fecha real de la venta; se usa para calcular el plazo de entrega */
  saleDate?: Date;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  // Limpiar campos vacíos
  const clean = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === "" ? undefined : v])
  );

  const shipment = await prisma.shipment.create({
    data: {
      ...clean,
      source: "MANUAL",
      status: "EN_PREPARACION",
      createdById: session.user.id,
      events: {
        create: {
          toStatus: "EN_PREPARACION",
          notes: "Envío creado manualmente",
          createdById: session.user.id,
        },
      },
    },
  });

  revalidatePath("/shipments");
  revalidatePath("/dashboard");
  return shipment;
}

// ─── Cambiar estado ───────────────────────────────────────────────────────────

export async function updateShipmentStatus(
  shipmentId: string,
  newStatus: ShipmentStatus,
  notes?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const current = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: { status: true, trackingToken: true },
  });
  if (!current) throw new Error("Envío no encontrado");

  if (!isValidTransition(current.status, newStatus)) {
    throw new Error(`Transición inválida: ${current.status} → ${newStatus}`);
  }

  const shipment = await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      status: newStatus,
      events: {
        create: {
          fromStatus: current.status,
          toStatus: newStatus,
          notes: notes ?? null,
          createdById: session.user.id,
        },
      },
    },
  });

  // Broadcast en tiempo real al tracking público
  try {
    const { broadcastTrackingUpdate } = await import("@/lib/supabase/server");
    await broadcastTrackingUpdate(current.trackingToken, {
      status: newStatus,
      timestamp: new Date().toISOString(),
      notes: notes ?? null,
    });
  } catch (e) {
    console.error("Broadcast error (non-critical):", e);
  }

  revalidatePath("/shipments");
  revalidatePath("/dashboard");
  revalidatePath(`/shipments/${shipmentId}`);
  return shipment;
}

// ─── Métricas del dashboard ───────────────────────────────────────────────────

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [preparing, inTransit, deliveredToday, incidents, recentShipments] =
    await Promise.all([
      prisma.shipment.count({ where: { status: "EN_PREPARACION" } }),
      prisma.shipment.count({ where: { status: "EN_CAMINO" } }),
      prisma.shipment.count({
        where: { status: "ENTREGADO", updatedAt: { gte: today } },
      }),
      prisma.shipment.count({ where: { status: "INCIDENCIA" } }),
      prisma.shipment.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          recipientName: true,
          status: true,
          city: true,
          updatedAt: true,
        },
      }),
    ]);

  return { preparing, inTransit, deliveredToday, incidents, recentShipments };
}


// ─── Eliminar envíos ──────────────────────────────────────────────────────────

export async function deleteShipments(ids: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (ids.length === 0) return;

  // Eliminar registros hijos primero para evitar violaciones de FK
  await prisma.shipmentEvent.deleteMany({ where: { shipmentId: { in: ids } } });
  await prisma.labelBatchItem.deleteMany({ where: { shipmentId: { in: ids } } });

  await prisma.shipment.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/shipments");
  revalidatePath("/dashboard");
}
