/**
 * Tipos del optimizador de rutas.
 * La interfaz RouteOptimizer permite intercambiar implementaciones
 * sin modificar la lógica de negocio.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Stop {
  shipmentId: string;
  recipientName: string;
  addressLine: string;
  city: string;
  coordinates: Coordinates | null; // null si no fue geocodificada
}

export interface OptimizedRoute {
  /** Paradas en el orden optimizado de visita */
  stops: Stop[];
  /**
   * Segmentos para Google Maps deep link.
   * Máximo MAPS_WAYPOINTS_PER_SEGMENT paradas por segmento.
   */
  segments: Stop[][];
  /** Estimación de distancia total (km) — puede ser null si no hay coordenadas */
  estimatedDistanceKm: number | null;
}

/**
 * Interfaz que toda implementación de optimizador debe cumplir.
 */
export interface RouteOptimizer {
  /**
   * Optimiza el orden de visita de las paradas.
   * @param stops Paradas a optimizar (con coordenadas)
   * @param origin Punto de partida del chofer (opcional)
   */
  optimize(stops: Stop[], origin?: Coordinates): Promise<OptimizedRoute>;
}

/** Máximo de paradas por segmento para el deep link de Google Maps */
export const MAPS_WAYPOINTS_PER_SEGMENT = 8;
