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

const fallbackLineStyle: L.PolylineOptions = {
  color: "#2563eb",
  weight: 4,
  opacity: 0.88,
};

/** Estilo tipo LRM (halos + trazo principal). */
const lrmLineOptions = {
  addWaypoints: false,
  extendToWaypoints: true,
  styles: [
    { color: "#1e40af", opacity: 0.22, weight: 10 },
    { color: "#2563eb", opacity: 0.9, weight: 5 },
  ],
};

type Props = Readonly<{
  /** [lat, lng] in order along the route */
  positions: [number, number][];
  /** OSRM vía leaflet-routing-machine en el cliente; si false, segmentos rectos */
  useRoads: boolean;
  /**
   * Si true (defecto), ajusta la vista al trazo. Desactivar cuando otro control (p. ej. modal) ya fija el encuadre.
   */
  fitMapToRoute?: boolean;
}>;

/**
 * Trazado alineado a calles (leaflet-routing-machine → OSRM en el navegador) o polilínea recta.
 * Las distancias por tramo para UI/precio van por el backend (`/api/v1/routing/leg-distances`).
 */
export function LeafletRoadSnappedRoute({
  positions,
  useRoads,
  fitMapToRoute = true,
}: Props) {
  const map = useMap();
  const routeLayerRef = useRef<(L.Layer & { getBounds: () => L.LatLngBounds }) | null>(
    null,
  );

  useEffect(() => {
    if (positions.length < 2) return undefined;

    let cancelled = false;

    const clear = () => {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
    };

    const fitToLayer = (layer: { getBounds: () => L.LatLngBounds }) => {
      if (!fitMapToRoute) return;
      try {
        map.fitBounds(layer.getBounds(), { padding: [12, 12], maxZoom: 10 });
      } catch {
        /* bounds vacíos */
      }
    };

    /** Polilínea recta (sin calles). */
    const addStraightLine = (latlngs: L.LatLngExpression[]) => {
      clear();
      if (cancelled) return;
      const pl = L.polyline(latlngs, fallbackLineStyle);
      pl.addTo(map);
      routeLayerRef.current = pl as unknown as L.Layer & {
        getBounds: () => L.LatLngBounds;
      };
      fitToLayer(pl);
    };

    if (!useRoads) {
      addStraightLine(positions.map(([lat, lng]) => L.latLng(lat, lng)));
      return () => {
        cancelled = true;
        clear();
      };
    }

    void ensureLeafletRoutingAttached().then(() => {
      if (cancelled) return;
      const LR = (L as unknown as { Routing: LrmRouting }).Routing;
      const router = LR.osrmv1({
        suppressDemoServerWarning: true,
      });
      const wps = positions.map(([lat, lng]) =>
        LR.waypoint(L.latLng(lat, lng)),
      );
      router.route(wps, (err: unknown, routes?: OsrmRoute[]) => {
        if (cancelled) return;
        if (err || !routes?.[0]?.coordinates?.length) {
          addStraightLine(positions.map(([lat, lng]) => L.latLng(lat, lng)));
          return;
        }
        clear();
        if (cancelled) return;
        const routeLayer = LR.line(routes[0], lrmLineOptions);
        routeLayer.addTo(map);
        routeLayerRef.current = routeLayer;
        fitToLayer(routeLayer);
      });
    });

    return () => {
      cancelled = true;
      clear();
    };
  }, [map, positions, useRoads, fitMapToRoute]);

  return null;
}
