/**
 * Constantes de estados de envío.
 * Fuente única de verdad para labels y transiciones válidas.
 */

import { ShipmentStatus } from "@prisma/client";

export const STATUS_LABEL_MAP: Record<ShipmentStatus, string> = {
  EN_PREPARACION: "En preparación",
  LISTO_PARA_ENVIAR: "Listo para enviar",
  ASIGNADO_CHOFER: "Asignado a chofer",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  INCIDENCIA: "Incidencia",
  CANCELADO: "Cancelado",
};

/**
 * Transiciones de estado válidas.
 * Define qué estado puede seguir a cada estado actual.
 * El MANAGER puede cancelar desde cualquier estado.
 */
export const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  EN_PREPARACION: [ShipmentStatus.LISTO_PARA_ENVIAR, ShipmentStatus.CANCELADO],
  LISTO_PARA_ENVIAR: [ShipmentStatus.ASIGNADO_CHOFER, ShipmentStatus.CANCELADO],
  ASIGNADO_CHOFER: [ShipmentStatus.EN_CAMINO, ShipmentStatus.CANCELADO],
  EN_CAMINO: [ShipmentStatus.ENTREGADO, ShipmentStatus.INCIDENCIA, ShipmentStatus.CANCELADO],
  ENTREGADO: [], // Estado final
  INCIDENCIA: [ShipmentStatus.ASIGNADO_CHOFER, ShipmentStatus.EN_CAMINO, ShipmentStatus.CANCELADO],
  CANCELADO: [], // Estado final
};

/**
 * Verifica si una transición de estado es válida.
 */
export function isValidTransition(
  from: ShipmentStatus,
  to: ShipmentStatus
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
