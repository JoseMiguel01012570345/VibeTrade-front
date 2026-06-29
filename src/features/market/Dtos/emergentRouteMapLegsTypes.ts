export type EmergentMapLeg = {
  orden: number;
  /** Id del tramo en hoja de ruta (`RouteStop.id`), si viene de `emergentMapLegsFromRouteStops`. */
  stopId?: string;
  label: string;
  origen: string;
  destino: string;
  oLat: number;
  oLng: number;
  dLat: number;
  dLng: number;
  /** Puntos aproximados (sin coords reales) solo para mostrar estructura. */
  synthetic: boolean;
  /** Polilínea por carretera persistida en servidor (OSRM al guardar la hoja). */
  osrmRouteLatLngs?: [number, number][];
  monedaPago?: string;
  precioTramo?: number | null;
};

export type EmergentMapWaypoint = {
  lat: number;
  lng: number;
  /** 1 = inicio de ruta; luego cada destino de tramo (N tramos → 1…N+1). */
  label: string;
};

export type EmergentMapIslandMarker = {
  lat: number;
  lng: number;
  kind: "tramo" | "finish";
  /** Orden del tramo (solo `tramo`: origen de ese tramo en el mapa). */
  tramoOrden?: number;
  /** Color del trazo / chapa (misma isla). */
  lineColor: string;
};
