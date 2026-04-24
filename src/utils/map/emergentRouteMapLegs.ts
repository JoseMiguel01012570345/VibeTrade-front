import type {
  EmergentRouteParadaSnapshot,
  Offer,
  RouteOfferPublicState,
} from "../../app/store/marketStoreTypes";
import { parseTransportistaPriceTramo } from "./routeLegMetrics";

export type EmergentMapLeg = {
  orden: number;
  label: string;
  origen: string;
  destino: string;
  oLat: number;
  oLng: number;
  dLat: number;
  dLng: number;
  /** Puntos aproximados (sin coords reales) solo para mostrar estructura. */
  synthetic: boolean;
  monedaPago?: string;
  precioTramo?: number | null;
};

function parseCoord(s: string | number | undefined): number | null {
  if (s === undefined || s === null) return null;
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  const n = parseFloat(String(s).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

/** Etiqueta por tramo en datos (no usada en el mapa; los vértices usan 1…N+1). */
function tramoLabel(index: number): string {
  return String(index + 1);
}

/** Puntos esquemáticos (sin coords reales en snapshot). */
function syntheticOD(index: number): { o: [number, number]; d: [number, number] } {
  const baseLat = 23.05;
  const baseLng = -82.3;
  const step = 0.08;
  return {
    o: [baseLat, baseLng + index * step],
    d: [baseLat + 0.06, baseLng + index * step + 0.05],
  };
}

function legFromRouteTramo(
  t: {
    orden: number;
    origenLine: string;
    destinoLine: string;
    origenLat?: string;
    origenLng?: string;
    destinoLat?: string;
    destinoLng?: string;
    precioTransportista?: string;
    monedaPago?: string;
  },
  index: number,
): EmergentMapLeg {
  const oLa = parseCoord(t.origenLat);
  const oLn = parseCoord(t.origenLng);
  const dLa = parseCoord(t.destinoLat);
  const dLn = parseCoord(t.destinoLng);
  const full = oLa !== null && oLn !== null && dLa !== null && dLn !== null;
  const s = syntheticOD(index);
  const moneda = t.monedaPago?.trim();
  return {
    orden: t.orden,
    label: tramoLabel(index),
    origen: t.origenLine,
    destino: t.destinoLine,
    oLat: full ? oLa! : s.o[0],
    oLng: full ? oLn! : s.o[1],
    dLat: full ? dLa! : s.d[0],
    dLng: full ? dLn! : s.d[1],
    synthetic: !full,
    monedaPago: moneda || undefined,
    precioTramo: parseTransportistaPriceTramo(t.precioTransportista),
  };
}

/**
 * Construye tramos para el mapa: prioriza `routeOffer` (hoja con coords) y
 * cae a `offer.emergentRouteParadas` (snapshot de API / recomendaciones).
 */
export function buildEmergentMapLegs(
  offer: Offer,
  routeOffer: RouteOfferPublicState | undefined,
): EmergentMapLeg[] {
  if (routeOffer?.tramos?.length) {
    return routeOffer.tramos.map((t, i) => legFromRouteTramo(t, i));
  }

  const snap: EmergentRouteParadaSnapshot[] | undefined = offer.emergentRouteParadas;
  if (snap?.length) {
    return snap.map((leg, i) => {
      const oLa = parseCoord(leg.origenLat);
      const oLn = parseCoord(leg.origenLng);
      const dLa = parseCoord(leg.destinoLat);
      const dLn = parseCoord(leg.destinoLng);
      const full = oLa !== null && oLn !== null && dLa !== null && dLn !== null;
      const s = syntheticOD(i);
      const moneda = leg.monedaPago?.trim();
      return {
        orden: i + 1,
        label: tramoLabel(i),
        origen: leg.origen,
        destino: leg.destino,
        oLat: full ? oLa! : s.o[0],
        oLng: full ? oLn! : s.o[1],
        dLat: full ? dLa! : s.d[0],
        dLng: full ? dLn! : s.d[1],
        synthetic: !full,
        monedaPago: moneda || undefined,
        precioTramo: parseTransportistaPriceTramo(leg.precioTransportista),
      };
    });
  }

  return [];
}

export type EmergentMapWaypoint = {
  lat: number;
  lng: number;
  /** 1 = inicio de ruta; luego cada destino de tramo (N tramos → 1…N+1). */
  label: string;
};

/**
 * Vértices de la ruta para el mapa: origen del primer tramo y destino de cada tramo
 * (N tramos ⇒ N+1 puntos). Evita duplicar el punto intermedio aunque vuelva como origen del siguiente tramo.
 */
export function emergentMapWaypoints(legs: EmergentMapLeg[]): EmergentMapWaypoint[] {
  if (legs.length === 0) return [];
  const out: EmergentMapWaypoint[] = [
    { lat: legs[0]!.oLat, lng: legs[0]!.oLng, label: "1" },
  ];
  for (let i = 0; i < legs.length; i++) {
    out.push({
      lat: legs[i]!.dLat,
      lng: legs[i]!.dLng,
      label: String(i + 2),
    });
  }
  return out;
}

/** Etiqueta de extremos del tramo con los números de parada del mapa (1→2, 2→3, …). */
export function tramoParadaNumeros(
  fullLegs: EmergentMapLeg[],
  orden: number,
): { fromN: number; toN: number } {
  const i = fullLegs.findIndex((l) => l.orden === orden);
  if (i < 0) return { fromN: orden, toN: orden + 1 };
  return { fromN: i + 1, toN: i + 2 };
}
