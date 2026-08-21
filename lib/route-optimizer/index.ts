/**
 * Punto de entrada del optimizador de rutas.
 *
 * Exporta la función principal y el optimizador activo.
 * Para cambiar la implementación (ej: pasar a Google Routes API),
 * solo hay que cambiar la línea de importación del optimizador.
 */

export { NearestNeighborOptimizer } from "./nearest-neighbor";
export type { RouteOptimizer, OptimizedRoute, Stop, Coordinates } from "./types";
export { MAPS_WAYPOINTS_PER_SEGMENT } from "./types";

import { NearestNeighborOptimizer } from "./nearest-neighbor";
import type { RouteOptimizer } from "./types";

/**
 * Instancia del optimizador activo.
 * En producción futura: new GoogleRouteOptimizer()
 */
export const activeOptimizer: RouteOptimizer = new NearestNeighborOptimizer();

/**
 * Construye el deep link de Google Maps para un segmento de paradas.
 * Máximo MAPS_WAYPOINTS_PER_SEGMENT paradas por segmento.
 *
 * @param stops Las paradas del segmento (ya ordenadas)
 * @param originCoords Coordenadas de origen del chofer (opcional)
 */
export function buildGoogleMapsUrl(
  stops: { addressLine: string; city: string; coordinates: { lat: number; lng: number } | null }[],
  originCoords?: { lat: number; lng: number }
): string {
  if (stops.length === 0) return "";

  // Helper: devuelve coordenadas o dirección codificada una sola vez
  function stopParam(s: { addressLine: string; city: string; coordinates: { lat: number; lng: number } | null }): string {
    if (s.coordinates) return `${s.coordinates.lat},${s.coordinates.lng}`;
    return encodeURIComponent(`${s.addressLine}, ${s.city}`);
  }

  // Construimos la URL manualmente para evitar doble encoding.
  // URLSearchParams codifica los valores automáticamente al hacer .toString(),
  // lo que causaría doble encoding si ya usamos encodeURIComponent antes.
  const parts: string[] = [
    "api=1",
    "travelmode=driving",
    `destination=${stopParam(stops[stops.length - 1])}`,
  ];

  if (originCoords) {
    parts.push(`origin=${originCoords.lat},${originCoords.lng}`);
  }

  // Waypoints: separados por | (pipe), que NO debe ser re-codificado
  if (stops.length > 1) {
    const waypoints = stops
      .slice(0, -1)
      .map(stopParam)
      .join("|");
    parts.push(`waypoints=${waypoints}`);
  }

  return `https://www.google.com/maps/dir/?${parts.join("&")}`;
}
