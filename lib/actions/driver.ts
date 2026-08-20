"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShipmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { broadcastTrackingUpdate } from "@/lib/supabase/server";
import { activeOptimizer, buildGoogleMapsUrl } from "@/lib/route-optimizer";
import { STATUS_LABEL_MAP } from "@/lib/constants/shipment-status";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ActionResult {
  success: boolean;
  error?: string;
  mapsUrl?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Construye el payload de tracking y lo emite via Supabase Broadcast.
 * Llama después de cada cambio de estado.
 */
async function emitTrackingUpdate(shipmentId: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      trackingToken: true,
      status: true,
      updatedAt: true,
      events: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          toStatus: true,
          notes: true,
          createdAt: true,
          createdBy: { select: { name: true } },
        },
      },
    },
  });

  if (!shipment) return;

  await broadcastTrackingUpdate(shipment.trackingToken, {
    status: shipment.status,
    statusLabel: STATUS_LABEL_MAP[shipment.status],
    updatedAt: shipment.updatedAt.toISOString(),
    events: shipment.events.map((e) => ({
      toStatus: e.toStatus,
      statusLabel: STATUS_LABEL_MAP[e.toStatus],
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
      createdByName: e.createdBy.name,
    })),
  });
}

// ── Server Actions ─────────────────────────────────────────────────────────────

/**
 * Inicia el recorrido para los envíos seleccionados.
 * - Marca todos como EN_CAMINO
 * - Asigna el chofer actual como assignedDriver
 * - Optimiza la ruta con nearest-neighbor
 * - Devuelve el deep link de Google Maps
 */
export async function startRoute(shipmentIds: string[]): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "No autorizado" };
  if (session.user.role !== "DRIVER") return { success: false, error: "Solo choferes pueden iniciar recorridos" };
  if (shipmentIds.length === 0) return { success: false, error: "Seleccioná al menos un pedido" };

  const driverId = session.user.id;
  const driverName = session.user.name ?? "Chofer";

  // Cargar envíos válidos (deben estar LISTO_PARA_ENVIAR)
  const shipments = await prisma.shipment.findMany({
    where: {
      id: { in: shipmentIds },
      status: ShipmentStatus.LISTO_PARA_ENVIAR,
    },
    select: {
      id: true,
      addressLine: true,
      city: true,
      province: true,
      lat: true,
      lng: true,
      trackingToken: true,
    },
  });

  if (shipments.length === 0) {
    return { success: false, error: "Ningún envío está en estado Listo para enviar" };
  }

  // Optimizar ruta
  const stops = shipments.map((s) => ({
    id: s.id,
    addressLine: s.addressLine,
    city: s.city,
    province: s.province,
    coordinates: s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null,
  }));

  const optimizedRoute = activeOptimizer.optimize(stops);
  const orderedStops = optimizedRoute.stops;

  // Construir URL de Google Maps
  const mapsUrl = buildGoogleMapsUrl(
    orderedStops.map((s) => ({
      addressLine: s.addressLine,
      city: s.city,
      coordinates: s.coordinates,
    }))
  );

  // Actualizar todos los envíos en una transacción
  await prisma.$transaction(async (tx) => {
    for (const shipment of shipments) {
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: ShipmentStatus.EN_CAMINO,
          assignedDriverId: driverId,
        },
      });

      await tx.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          fromStatus: ShipmentStatus.LISTO_PARA_ENVIAR,
          toStatus: ShipmentStatus.EN_CAMINO,
          createdById: driverId,
          notes: `Recorrido iniciado por ${driverName}`,
        },
      });
    }

    // Crear registro de ruta
    await tx.route.create({
      data: {
        driverId,
        startedAt: new Date(),
        items: {
          create: orderedStops.map((stop, index) => ({
            shipmentId: stop.id,
            deliveryOrder: index + 1,
            segment: Math.floor(index / 8) + 1,
          })),
        },
      },
    });
  });

  // Broadcast en paralelo (best-effort)
  await Promise.allSettled(shipments.map((s) => emitTrackingUpdate(s.id)));

  revalidatePath("/assignments");

  return { success: true, mapsUrl };
}

/**
 * Marca un envío como ENTREGADO.
 */
export async function markDelivered(shipmentId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "No autorizado" };

  const driverId = session.user.id;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: { status: true, assignedDriverId: true },
  });

  if (!shipment) return { success: false, error: "Envío no encontrado" };
  if (shipment.status !== ShipmentStatus.EN_CAMINO) {
    return { success: false, error: "El envío no está en camino" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: ShipmentStatus.ENTREGADO },
    });

    await tx.shipmentEvent.create({
      data: {
        shipmentId,
        fromStatus: ShipmentStatus.EN_CAMINO,
        toStatus: ShipmentStatus.ENTREGADO,
        createdById: driverId,
      },
    });

    // Marcar delivery en la ruta
    await tx.routeItem.updateMany({
      where: { shipmentId },
      data: { deliveredAt: new Date() },
    });
  });

  await emitTrackingUpdate(shipmentId);

  revalidatePath("/assignments");
  revalidatePath(`/assignments/${shipmentId}`);

  return { success: true };
}

/**
 * Reporta una incidencia en un envío.
 * Cambia el estado a INCIDENCIA y guarda la nota.
 */
export async function reportIncident(
  shipmentId: string,
  note: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "No autorizado" };

  if (!note.trim()) return { success: false, error: "Escribí una nota describiendo la incidencia" };

  const driverId = session.user.id;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: { status: true },
  });

  if (!shipment) return { success: false, error: "Envío no encontrado" };
  if (shipment.status !== ShipmentStatus.EN_CAMINO) {
    return { success: false, error: "El envío no está en camino" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: ShipmentStatus.INCIDENCIA },
    });

    await tx.shipmentEvent.create({
      data: {
        shipmentId,
        fromStatus: ShipmentStatus.EN_CAMINO,
        toStatus: ShipmentStatus.INCIDENCIA,
        createdById: driverId,
        notes: note.trim(),
      },
    });
  });

  await emitTrackingUpdate(shipmentId);

  revalidatePath("/assignments");
  revalidatePath(`/assignments/${shipmentId}`);

  return { success: true };
}
