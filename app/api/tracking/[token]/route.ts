/**
 * API pública de tracking.
 * GET /api/tracking/[token]
 *
 * Acceso público (sin autenticación).
 * Devuelve únicamente los datos necesarios para mostrar el estado del envío.
 * NO devuelve datos sensibles de la base de datos.
 *
 * Seguridad:
 * - Solo devuelve el envío cuyo trackingToken coincide exactamente.
 * - El token es un UUID v4 (prácticamente imposible de adivinar).
 * - No devuelve el ID interno ni datos del Gestor/Chofer.
 * - Rate limiting: implementar en producción con un reverse proxy o middleware.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL_MAP } from "@/lib/constants/shipment-status";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  // Validar formato UUID básico
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return NextResponse.json(
      { error: "Token de seguimiento inválido" },
      { status: 400 }
    );
  }

  const shipment = await prisma.shipment.findUnique({
    where: { trackingToken: token },
    select: {
      // Solo campos públicos — nunca exponer IDs internos, datos del gestor, etc.
      orderNumber: true,
      status: true,
      recipientName: true,
      city: true,
      province: true,
      updatedAt: true,
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          toStatus: true,
          notes: true,
          incidentType: true,
          createdAt: true,
          // Solo el nombre, nunca el email ni el ID del usuario
          createdBy: { select: { name: true, role: true } },
        },
      },
    },
  });

  if (!shipment) {
    return NextResponse.json(
      { error: "Envío no encontrado" },
      { status: 404 }
    );
  }

  // Transformar para la respuesta — solo lo que el cliente necesita ver
  return NextResponse.json({
    orderNumber: shipment.orderNumber,
    status: shipment.status,
    statusLabel: STATUS_LABEL_MAP[shipment.status],
    recipientName: shipment.recipientName,
    city: shipment.city,
    province: shipment.province,
    updatedAt: shipment.updatedAt.toISOString(),
    events: shipment.events.map((e) => ({
      toStatus: e.toStatus,
      statusLabel: STATUS_LABEL_MAP[e.toStatus],
      notes: e.notes,
      incidentType: e.incidentType,
      createdAt: e.createdAt.toISOString(),
      // Mostrar "Sistema" en lugar del nombre real si fue automático
      actor:
        e.createdBy.role === "MANAGER"
          ? "Gestor"
          : e.createdBy.role === "DRIVER"
          ? "Chofer"
          : "Sistema",
    })),
  });
}
