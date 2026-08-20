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

  const baseUrl = "https://www.google.com/maps/dir/";
  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("travelmode", "driving");

  // Destino final (última parada)
  const lastStop = stops[stops.length - 1];
  const destQuery = lastStop.coordinates
    ? `${lastStop.coordinates.lat},${lastStop.coordinates.lng}`
    : `${encodeURIComponent(`${lastStop.addressLine}, ${lastStop.city}`)}`;
  params.set("destination", destQuery);

  // Origen
  if (originCoords) {
    params.set("origin", `${originCoords.lat},${originCoords.lng}`);
  }

  // Waypoints intermedios (todas las paradas excepto la última)
  if (stops.length > 1) {
    const waypoints = stops
      .slice(0, -1)
      .map((s) =>
        s.coordinates
          ? `${s.coordinates.lat},${s.coordinates.lng}`
          : `${s.addressLine}, ${s.city}`
      )
      .join("|");
    params.set("waypoints", waypoints);
  }

  return `${baseUrl}?${params.toString()}`;
}
