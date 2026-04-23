import type { EmergentRouteParadaSnapshot, RouteOfferPublicState } from "../../app/store/marketStoreTypes";
import type { Offer } from "../../app/store/useMarketStore";

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
};

function parseCoord(s: string | number | undefined): number | null {
  if (s === undefined || s === null) return null;
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  const n = parseFloat(String(s).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function tramoLabel(index: number): string {
  return String.fromCharCode(65 + Math.min(25, Math.max(0, index)));
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
  t: { orden: number; origenLine: string; destinoLine: string; origenLat?: string; origenLng?: string; destinoLat?: string; destinoLng?: string },
  index: number,
): EmergentMapLeg {
  const oLa = parseCoord(t.origenLat);
  const oLn = parseCoord(t.origenLng);
  const dLa = parseCoord(t.destinoLat);
  const dLn = parseCoord(t.destinoLng);
  const full = oLa !== null && oLn !== null && dLa !== null && dLn !== null;
  const s = syntheticOD(index);
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
      };
    });
  }

  return [];
}
