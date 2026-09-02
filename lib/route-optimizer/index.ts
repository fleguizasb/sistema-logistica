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
 * Construye el deep link de Google Maps para las paradas (ya ordenadas).
 *
 * IMPORTANTE: Se construye la URL manualmente —  NO usar URLSearchParams.
 * URLSearchParams codifica el pipe | como %7C, que Google Maps no reconoce
 * como separador de waypoints, haciendo que muestre pines sueltos sin ruta.
 *
 * Formato resultante:
 *   https://www.google.com/maps/dir/?api=1&travelmode=driving
 *     &destination=lat,lng
 *     &origin=lat,lng        (solo si se pasa originCoords)
 *     &waypoints=lat,lng|lat,lng|...
 *
 * @param stops Las paradas del segmento (ya ordenadas por el optimizador)
 * @param originCoords Coordenadas de origen del chofer (opcional)
 */
export function buildGoogleMapsUrl(
  stops: { addressLine: string; city: string; coordinates: { lat: number; lng: number } | null }[],
  originCoords?: { lat: number; lng: number }
): string {
  if (stops.length === 0) return "";

  /**
   * Devuelve el parámetro de una parada:
   * - Con coordenadas: "lat,lng"     (sin encoding — comas son válidas en query strings)
   * - Sin coordenadas: dirección codificada con encodeURIComponent
   *   (se agrega Argentina para mejorar el geocoding)
   */
  function stopParam(
    s: { addressLine: string; city: string; coordinates: { lat: number; lng: number } | null }
  ): string {
    if (s.coordinates) return `${s.coordinates.lat},${s.coordinates.lng}`;
    return encodeURIComponent(`${s.addressLine}, ${s.city}, Argentina`);
  }

  // Construimos la URL con string concatenation para evitar doble encoding.
  const parts: string[] = [
    "api=1",
    "travelmode=driving",
    `destination=${stopParam(stops[stops.length - 1])}`,
  ];

  if (originCoords) {
    parts.push(`origin=${originCoords.lat},${originCoords.lng}`);
  }

  // Waypoints: stops intermedias separadas por | (pipe sin codificar).
  // Google Maps acepta hasta 8 waypoints + origin + destination = 10 paradas totales.
  if (stops.length > 1) {
    const waypoints = stops
      .slice(0, -1)
      .map(stopParam)
      .join("|");
    parts.push(`waypoints=${waypoints}`);
  }

  return `https://www.google.com/maps/dir/?${parts.join("&")}`;
}
