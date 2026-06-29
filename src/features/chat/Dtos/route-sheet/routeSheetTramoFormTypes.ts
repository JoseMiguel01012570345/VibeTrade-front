/** Punto geográfico + etiqueta para rellenar tramos al insertar en medio de la lista. */
export type EffectiveRoutePlace = {
  text: string;
  lat: string;
  lng: string;
};

/** Coordenadas + texto de dirección ya expandidos por cadena (mismo criterio que el mapa de destino). */
export type ExpandedTramoPlaceCoords = {
  lat: number;
  lng: number;
  placeLabel: string;
};

export type DestinoMapPriorContext = {
  /** Trazos O→D por tramo 0..k-1 (sin unir por carretera el destino de uno con el origen del siguiente). */
  routeSegments: [number, number][][];
  /** Color por segmento (islas conexas entre tramos previos). */
  segmentColors: string[];
  /** Todos los vértices de los tramos previos (encuadre de cámara / compat). */
  linePositions: [number, number][];
  /** Finales de tramo 1…k (índice 0-based: etiqueta = j+1 en el D_j). */
  endMarkers: { lat: number; lng: number; label: string }[];
};
