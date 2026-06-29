import type { EmergentMapLeg } from "@features/market/model/map/emergentRouteMapLegs";

export type EmergentRouteFeedMapProps = Readonly<{
  legs: EmergentMapLeg[];
  className?: string;
  mapKey: string;
  /** Mapa con zoom y arrastre (p. ej. vista «grande»). */
  interactive?: boolean;
}>;

export type PointLocationFeedMapProps = Readonly<{
  location: { lat: number; lng: number };
  mapKey: string;
  className?: string;
  /** Mapa con zoom/arrastre; si no, solo lectura (feed / ficha). */
  interactive?: boolean;
  /**
   * Zoom inicial tras ajustar al punto (mini tienda 14, ficha 15–16).
   * @default 15
   */
  fixedZoom?: number;
  /** Muestra atribución OSM; desactivar en avatares / mini mapas. @default true */
  showAttribution?: boolean;
}>;
