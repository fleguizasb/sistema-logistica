/**
 * Optimizador de rutas: algoritmo del Vecino más Cercano (Nearest Neighbor).
 *
 * Complejidad: O(n²) — eficiente para n < 50 paradas.
 * Resultado: típicamente 15-25% peor que el óptimo global, aceptable en la práctica.
 * Costo: CERO — no usa APIs externas.
 *
 * Para reemplazarlo con Google Routes Optimization API en el futuro,
 * solo hay que crear GoogleRouteOptimizer implementando la misma interfaz.
 */

import type {
  RouteOptimizer,
  OptimizedRoute,
  Stop,
  Coordinates,
} from "./types";
import { MAPS_WAYPOINTS_PER_SEGMENT } from "./types";

/**
 * Distancia euclidiana entre dos coordenadas (en grados, no km reales).
 * Suficiente para ordenamiento relativo — no se usa como distancia real.
 * Para distancias reales usar la fórmula de Haversine.
 */
function euclideanDistance(a: Coordinates, b: Coordinates): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Distancia Haversine entre dos coordenadas (en km).
 * Se usa para la estimación de distancia total.
 */
function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng *
      sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Divide un array en chunks de tamaño máximo `size`.
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export class NearestNeighborOptimizer implements RouteOptimizer {
  async optimize(stops: Stop[], origin?: Coordinates): Promise<OptimizedRoute> {
    // Separar paradas con y sin coordenadas
    const withCoords = stops.filter((s) => s.coordinates !== null);
    const withoutCoords = stops.filter((s) => s.coordinates === null);

    if (withCoords.length === 0) {
      // Sin coordenadas: mantener orden original y agregar las sin coords al final
      const allStops = [...stops];
      return {
        stops: allStops,
        segments: chunkArray(allStops, MAPS_WAYPOINTS_PER_SEGMENT),
        estimatedDistanceKm: null,
      };
    }

    // Algoritmo Nearest Neighbor
    const unvisited = [...withCoords];
    const ordered: Stop[] = [];

    // Punto de partida
    let current: Coordinates = origin ?? unvisited[0].coordinates!;

    while (unvisited.length > 0) {
      // Encontrar la parada más cercana al punto actual
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = euclideanDistance(current, unvisited[i].coordinates!);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const nearest = unvisited.splice(nearestIdx, 1)[0];
      ordered.push(nearest);
      current = nearest.coordinates!;
    }

    // Agregar paradas sin coordenadas al final del recorrido
    const allOrdered = [...ordered, ...withoutCoords];

    // Calcular distancia total estimada (solo paradas con coordenadas)
    let estimatedDistanceKm = 0;
    const coordsOrdered = ordered.map((s) => s.coordinates!);

    if (origin && coordsOrdered.length > 0) {
      estimatedDistanceKm += haversineKm(origin, coordsOrdered[0]);
    }

    for (let i = 0; i < coordsOrdered.length - 1; i++) {
      estimatedDistanceKm += haversineKm(coordsOrdered[i], coordsOrdered[i + 1]);
    }

    // Dividir en segmentos para Google Maps deep link
    const segments = chunkArray(allOrdered, MAPS_WAYPOINTS_PER_SEGMENT);

    return {
      stops: allOrdered,
      segments,
      estimatedDistanceKm: Math.round(estimatedDistanceKm * 10) / 10,
    };
  }
}
