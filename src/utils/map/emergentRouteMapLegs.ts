import type {
  EmergentRouteParadaSnapshot,
  Offer,
  RouteOfferPublicState,
} from "../../app/store/marketStoreTypes";
import type { RouteStop } from "../../pages/chat/domain/routeSheetTypes";
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

/** Umbral para considerar que el destino de un tramo y el origen del siguiente son el mismo vértice (misma subruta conexa). */
const EMERGENT_LEG_CONNECT_MAX_M = 160;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** True si el fin del tramo `a` coincide (≈) con el inicio del tramo `b` → mismo trazo conexo. */
export function emergentLegConnectsToNext(a: EmergentMapLeg, b: EmergentMapLeg): boolean {
  return (
    haversineMeters(a.dLat, a.dLng, b.oLat, b.oLng) <= EMERGENT_LEG_CONNECT_MAX_M
  );
}

/** Colores por subruta conexa (ciclan si hay muchas islas). */
export const ROUTE_ISLAND_LINE_COLORS = [
  "#2563eb",
  "#c026d3",
  "#ca8a04",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#0d9488",
  "#dc2626",
  "#0891b2",
  "#65a30d",
] as const;

/** Semilla estable a partir de la geometría de la hoja (mismos tramos → mismos colores). */
function legsColorSeed(legs: EmergentMapLeg[]): number {
  let h = 2166136261 >>> 0;
  for (const l of legs) {
    const part = `${l.orden}:${l.oLat},${l.oLng},${l.dLat},${l.dLng}`;
    for (let i = 0; i < part.length; i++) {
      h ^= part.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Orden aleatorio de la paleta por ruta (determinista con la semilla). */
function shuffledRouteColors(seed: number): string[] {
  const palette = [...ROUTE_ISLAND_LINE_COLORS];
  const rand = mulberry32(seed);
  for (let i = palette.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = palette[i]!;
    palette[i] = palette[j]!;
    palette[j] = a;
  }
  return palette;
}

/** Un color por tramo; el mismo para todos los tramos de una misma isla. */
export function emergentMapRouteSegmentColors(legs: EmergentMapLeg[]): string[] {
  if (legs.length === 0) return [];
  const order = shuffledRouteColors(legsColorSeed(legs));
  const colors: string[] = new Array(legs.length);
  let islandIdx = 0;
  let islandStart = 0;
  for (let i = 0; i < legs.length; i++) {
    const isIslandEnd =
      i === legs.length - 1 ||
      !emergentLegConnectsToNext(legs[i]!, legs[i + 1]!);
    if (isIslandEnd) {
      const c = order[islandIdx % order.length]!;
      for (let j = islandStart; j <= i; j++) {
        colors[j] = c;
      }
      islandIdx++;
      islandStart = i + 1;
    }
  }
  return colors;
}

/**
 * Tramos con coords completas, ordenados por `orden` (alineado a un segmento O→D por fila en el mapa).
 */
export function emergentMapLegsFromRouteStops(paradas: RouteStop[]): EmergentMapLeg[] {
  const sorted = [...paradas].sort((a, b) => a.orden - b.orden);
  const out: EmergentMapLeg[] = [];
  for (const p of sorted) {
    const oLa = parseCoord(p.origenLat);
    const oLn = parseCoord(p.origenLng);
    const dLa = parseCoord(p.destinoLat);
    const dLn = parseCoord(p.destinoLng);
    if (oLa === null || oLn === null || dLa === null || dLn === null) continue;
    out.push({
      orden: p.orden,
      label: String(out.length + 1),
      origen: p.origen,
      destino: p.destino,
      oLat: oLa,
      oLng: oLn,
      dLat: dLa,
      dLng: dLn,
      synthetic: false,
      monedaPago: p.monedaPago?.trim() || undefined,
      precioTramo: parseTransportistaPriceTramo(p.precioTransportista),
    });
  }
  return out;
}

export type EmergentMapIslandMarker = {
  lat: number;
  lng: number;
  kind: "tramo" | "finish";
  /** Orden del tramo (solo `tramo`: origen de ese tramo en el mapa). */
  tramoOrden?: number;
  /** Color del trazo / chapa (misma isla). */
  lineColor: string;
};

/**
 * Marcadores por «isla» conexa: un número en el **origen** de cada tramo de la subruta y 🏁 en el destino del último tramo.
 */
export function emergentMapIslandMarkers(legs: EmergentMapLeg[]): EmergentMapIslandMarker[] {
  if (legs.length === 0) return [];
  const lineColors = emergentMapRouteSegmentColors(legs);
  const out: EmergentMapIslandMarker[] = [];
  let islandStart = 0;
  for (let i = 0; i < legs.length; i++) {
    const isIslandEnd =
      i === legs.length - 1 ||
      !emergentLegConnectsToNext(legs[i]!, legs[i + 1]!);
    if (isIslandEnd) {
      const b = i;
      for (let j = islandStart; j <= b; j++) {
        const leg = legs[j]!;
        out.push({
          lat: leg.oLat,
          lng: leg.oLng,
          kind: "tramo",
          tramoOrden: leg.orden,
          lineColor: lineColors[j]!,
        });
      }
      const last = legs[b]!;
      out.push({
        lat: last.dLat,
        lng: last.dLng,
        kind: "finish",
        lineColor: lineColors[b]!,
      });
      islandStart = i + 1;
    }
  }
  return out;
}

/**
 * Vértices de la ruta para el mapa: origen del primer tramo y destino de cada tramo
 * (N tramos ⇒ N+1 puntos). Evita duplicar el punto intermedio aunque vuelva como origen del siguiente tramo.
 * @deprecated Preferir `emergentMapIslandMarkers` + `emergentMapRouteSegments` para rutas no conexas.
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

/**
 * Un par origen→destino por tramo para el mapa (sin enrutar entre el fin de un tramo y el inicio del siguiente).
 */
export function emergentMapRouteSegments(legs: EmergentMapLeg[]): [number, number][][] {
  return legs.map((leg) => [
    [leg.oLat, leg.oLng],
    [leg.dLat, leg.dLng],
  ]);
}

/**
 * Texto corto para la leyenda del mapa (subrutas conexas: marca = orden inicial, bandera = fin).
 */
export function tramoMapSubrouteHint(fullLegs: EmergentMapLeg[], orden: number): string {
  const i = fullLegs.findIndex((l) => l.orden === orden);
  if (i < 0) return "";
  let a = i;
  while (a > 0 && emergentLegConnectsToNext(fullLegs[a - 1]!, fullLegs[a]!)) {
    a--;
  }
  let b = i;
  while (
    b < fullLegs.length - 1 &&
    emergentLegConnectsToNext(fullLegs[b]!, fullLegs[b + 1]!)
  ) {
    b++;
  }
  const start = fullLegs[a]!.orden;
  const end = fullLegs[b]!.orden;
  if (a === b) {
    return `mapa: ${start} → final`;
  }
  return `mapa: ${start}–${end} (un trazo) · final en tramo ${end}`;
}

/** @deprecated Usar `tramoMapSubrouteHint`; se mantiene por si algún llamador esperaba índices 1…N+1. */
export function tramoParadaNumeros(
  fullLegs: EmergentMapLeg[],
  orden: number,
): { fromN: number; toN: number } {
  const i = fullLegs.findIndex((l) => l.orden === orden);
  if (i < 0) return { fromN: orden, toN: orden + 1 };
  return { fromN: i + 1, toN: i + 2 };
}
