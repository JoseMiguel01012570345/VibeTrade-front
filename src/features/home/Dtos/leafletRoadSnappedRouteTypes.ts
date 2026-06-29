import type L from "leaflet";

export type OsrmRoute = {
  coordinates: L.LatLng[];
  inputWaypoints?: unknown[];
};

export type LrmRouting = {
  osrmv1: (o: Record<string, unknown>) => {
    route: (
      wps: unknown[],
      cb: (err: unknown, routes?: OsrmRoute[]) => void,
      ctx?: unknown,
    ) => void;
  };
  waypoint: (ll: L.LatLng, name?: string, options?: unknown) => unknown;
  line: (
    route: OsrmRoute,
    options?: Record<string, unknown>,
  ) => L.Layer & { getBounds: () => L.LatLngBounds };
};

export type LeafletRoadSnappedRouteProps = Readonly<{
  /** Un solo trazo conectando todos los puntos en orden (compatibilidad). */
  positions?: [number, number][];
  /**
   * Varios tramos independientes (p. ej. un par O→D por cada leg). Si hay al menos un
   * segmento válido, tiene prioridad sobre `positions` y no se enruta entre el fin de un
   * tramo y el inicio del siguiente.
   */
  segments?: [number, number][][];
  /** Un color hex por entrada de `segments` (misma longitud o se cicla el último / default). */
  segmentColors?: string[];
  /** OSRM vía leaflet-routing-machine en el cliente; si false, segmentos rectos o polilínea ya resuelta. */
  useRoads: boolean;
  /**
   * Con `useRoads: false`, dibuja trazo «tipo carretera» (doble línea) en lugar de segmento fino recto.
   * Usar cuando los puntos vienen de OSRM persistido en servidor.
   */
  roadLikePolylines?: boolean;
  /**
   * Si true (defecto), ajusta la vista al trazo. Desactivar cuando otro control (p. ej. modal) ya fija el encuadre.
   */
  fitMapToRoute?: boolean;
}>;
