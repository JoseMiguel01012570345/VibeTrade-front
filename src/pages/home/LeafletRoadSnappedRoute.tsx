import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

let lrmLoad: Promise<void> | null = null;

function ensureLeafletRoutingAttached(): Promise<void> {
  if (!lrmLoad) {
    if (typeof window !== "undefined") {
      (window as unknown as { L: typeof L }).L = L;
    }
    lrmLoad = import("leaflet-routing-machine").then(() => undefined);
  }
  return lrmLoad;
}

type OsrmRoute = {
  coordinates: L.LatLng[];
  inputWaypoints?: unknown[];
};

type LrmRouting = {
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

const DEFAULT_LINE_COLOR = "#2563eb";

function straightStyle(color: string): L.PolylineOptions {
  return { color, weight: 4, opacity: 0.88 };
}

function lrmLineOptionsFor(main: string) {
  return {
    addWaypoints: false,
    extendToWaypoints: true,
    styles: [
      { color: main, opacity: 0.22, weight: 10 },
      { color: main, opacity: 0.9, weight: 5 },
    ],
  };
}

function effectiveSegments(
  positions: [number, number][] | undefined,
  segments: [number, number][][] | undefined,
): [number, number][][] {
  const fromSeg = segments?.filter((s) => s.length >= 2) ?? [];
  if (fromSeg.length > 0) return fromSeg;
  if (positions && positions.length >= 2) return [positions];
  return [];
}

type Props = Readonly<{
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
  /** OSRM vía leaflet-routing-machine en el cliente; si false, segmentos rectos */
  useRoads: boolean;
  /**
   * Si true (defecto), ajusta la vista al trazo. Desactivar cuando otro control (p. ej. modal) ya fija el encuadre.
   */
  fitMapToRoute?: boolean;
}>;

function colorAt(segmentColors: string[] | undefined, i: number): string {
  if (!segmentColors?.length) return DEFAULT_LINE_COLOR;
  return segmentColors[i] ?? segmentColors[segmentColors.length - 1] ?? DEFAULT_LINE_COLOR;
}

/**
 * Trazado alineado a calles (leaflet-routing-machine → OSRM en el navegador) o polilínea recta.
 * Varias piernas (`segments`) se dibujan por separado (rutas no conexas).
 * Las distancias por tramo para UI/precio van por el backend (`/api/v1/routing/leg-distances`).
 */
export function LeafletRoadSnappedRoute({
  positions,
  segments,
  segmentColors,
  useRoads,
  fitMapToRoute = true,
}: Props) {
  const map = useMap();
  const routeLayerRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    const legs = effectiveSegments(positions, segments);
    if (legs.length === 0) return undefined;

    let cancelled = false;

    const clear = () => {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
    };

    const fitToLayer = (layer: L.FeatureGroup) => {
      if (!fitMapToRoute) return;
      try {
        map.fitBounds(layer.getBounds(), { padding: [12, 12], maxZoom: 10 });
      } catch {
        /* bounds vacíos */
      }
    };

    const addStraightLegs = (latlngLegs: L.LatLngExpression[][]) => {
      clear();
      if (cancelled) return;
      const fg = L.featureGroup();
      latlngLegs.forEach((latlngs, idx) => {
        L.polyline(latlngs, straightStyle(colorAt(segmentColors, idx))).addTo(fg);
      });
      fg.addTo(map);
      routeLayerRef.current = fg;
      fitToLayer(fg);
    };

    const latLngLegsFromCoords = (coords: [number, number][][]) =>
      coords.map((leg) => leg.map(([lat, lng]) => L.latLng(lat, lng)));

    if (!useRoads) {
      addStraightLegs(latLngLegsFromCoords(legs));
      return () => {
        cancelled = true;
        clear();
      };
    }

    void ensureLeafletRoutingAttached().then(async () => {
      if (cancelled) return;
      const LR = (L as unknown as { Routing: LrmRouting }).Routing;
      const router = LR.osrmv1({
        suppressDemoServerWarning: true,
      });

      const fg = L.featureGroup();

      for (let legIdx = 0; legIdx < legs.length; legIdx++) {
        if (cancelled) return;
        const leg = legs[legIdx]!;
        const lineColor = colorAt(segmentColors, legIdx);
        const wps = leg.map(([lat, lng]) => LR.waypoint(L.latLng(lat, lng)));
        await new Promise<void>((resolve) => {
          router.route(wps, (err: unknown, routes?: OsrmRoute[]) => {
            if (cancelled) {
              resolve();
              return;
            }
            if (err || !routes?.[0]?.coordinates?.length) {
              L.polyline(
                leg.map(([lat, lng]) => L.latLng(lat, lng)),
                straightStyle(lineColor),
              ).addTo(fg);
              resolve();
              return;
            }
            LR.line(routes[0], lrmLineOptionsFor(lineColor)).addTo(fg);
            resolve();
          });
        });
      }

      if (cancelled) return;
      clear();
      if (cancelled) return;
      fg.addTo(map);
      routeLayerRef.current = fg;
      fitToLayer(fg);
    });

    return () => {
      cancelled = true;
      clear();
    };
  }, [map, positions, segments, segmentColors, useRoads, fitMapToRoute]);

  return null;
}
