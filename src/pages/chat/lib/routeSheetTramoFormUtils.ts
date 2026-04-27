import type { RouteTramoFormInput } from "../domain/routeSheetTypes";
import {
  emergentMapRouteSegmentColors,
  type EmergentMapLeg,
} from "../../../utils/map/emergentRouteMapLegs";

/** Punto geográfico + etiqueta para rellenar tramos al insertar en medio de la lista. */
export type EffectiveRoutePlace = {
  text: string;
  lat: string;
  lng: string;
};

export function effectiveDestino(tramo: RouteTramoFormInput): EffectiveRoutePlace {
  return {
    text: tramo.destino?.trim() ?? "",
    lat: (tramo.destinoLat ?? "").trim(),
    lng: (tramo.destinoLng ?? "").trim(),
  };
}

/**
 * Origen «real» del tramo: coords propias en el formulario o, si encadena, el destino del anterior.
 */
export function effectiveOrigen(
  tramo: RouteTramoFormInput,
  prev: RouteTramoFormInput | null,
): EffectiveRoutePlace {
  const ownLat = (tramo.origenLat ?? "").trim();
  const ownLng = (tramo.origenLng ?? "").trim();
  if (ownLat !== "" && ownLng !== "") {
    const fallbackName = prev ? effectiveDestino(prev).text : "";
    return {
      text: tramo.origen?.trim() || fallbackName,
      lat: ownLat,
      lng: ownLng,
    };
  }
  if (prev) {
    const d = effectiveDestino(prev);
    return { text: d.text, lat: d.lat, lng: d.lng };
  }
  return {
    text: tramo.origen?.trim() ?? "",
    lat: (tramo.origenLat ?? "").trim(),
    lng: (tramo.origenLng ?? "").trim(),
  };
}

export function parseRouteLatLngInputPair(
  latRaw: string,
  lngRaw: string,
): { lat: number; lng: number } | null {
  const lat = Number(latRaw.trim().replace(/\s/g, "").replace(",", "."));
  const lng = Number(lngRaw.trim().replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function emptyTramo(): RouteTramoFormInput {
  return tramoFormWithEndpointsOnly({
    origen: "",
    origenLat: "",
    origenLng: "",
    destino: "",
    destinoLat: "",
    destinoLng: "",
  });
}

/** Tramo con solo origen/destino (texto y coords); resto de campos en blanco (inserción en la hoja). */
function tramoFormWithEndpointsOnly(endpoints: {
  origen: string;
  origenLat: string;
  origenLng: string;
  destino: string;
  destinoLat: string;
  destinoLng: string;
}): RouteTramoFormInput {
  return {
    paradaId: undefined,
    origen: endpoints.origen,
    destino: endpoints.destino,
    origenLat: endpoints.origenLat,
    origenLng: endpoints.origenLng,
    destinoLat: endpoints.destinoLat,
    destinoLng: endpoints.destinoLng,
    tiempoRecogidaEstimado: "",
    tiempoEntregaEstimado: "",
    precioTransportista: "",
    cargaEnTramo: "",
    tipoMercanciaCarga: "",
    tipoMercanciaDescarga: "",
    notas: "",
    responsabilidadEmbalaje: "",
    requisitosEspeciales: "",
    tipoVehiculoRequerido: "",
    telefonoTransportista: "",
    transportInvitedStoreServiceId: "",
    transportInvitedServiceSummary: "",
    monedaPago: "",
  };
}

/**
 * Tramo nuevo entre `prev` y `next`: solo se rellenan origen y destino (lugar + coords);
 * tiempos, precio, carga, moneda, transportista, etc. quedan vacíos.
 */
export function emptyTramoInsertedBetween(
  prev: RouteTramoFormInput,
  next: RouteTramoFormInput,
): RouteTramoFormInput {
  const oEnd = effectiveDestino(prev);
  const oStart = effectiveOrigen(next, prev);
  return tramoFormWithEndpointsOnly({
    origen: oEnd.text,
    origenLat: oEnd.lat,
    origenLng: oEnd.lng,
    destino: oStart.text,
    destinoLat: oStart.lat,
    destinoLng: oStart.lng,
  });
}

/**
 * Nuevo tramo antes del primero: solo destino = origen efectivo del antiguo primer tramo;
 * el origen del nuevo tramo queda en blanco para que lo complete el usuario.
 */
export function emptyTramoInsertedBeforeFirst(
  next: RouteTramoFormInput,
): RouteTramoFormInput {
  const o = effectiveOrigen(next, null);
  return tramoFormWithEndpointsOnly({
    origen: "",
    origenLat: "",
    origenLng: "",
    destino: o.text,
    destinoLat: o.lat,
    destinoLng: o.lng,
  });
}

/**
 * Limpia strings del formulario; tras esto, encadenar con <see cref="expandChainedTramoOrigins" />.
 */
export function tramosToLimpios(
  tramos: RouteTramoFormInput[],
): RouteTramoFormInput[] {
  return tramos.map((p) => ({
    paradaId: p.paradaId?.trim() || undefined,
    origen: p.origen.trim(),
    destino: p.destino.trim(),
    origenLat: p.origenLat?.trim() ?? "",
    origenLng: p.origenLng?.trim() ?? "",
    destinoLat: p.destinoLat?.trim() ?? "",
    destinoLng: p.destinoLng?.trim() ?? "",
    tiempoRecogidaEstimado: p.tiempoRecogidaEstimado?.trim() ?? "",
    tiempoEntregaEstimado: p.tiempoEntregaEstimado?.trim() ?? "",
    precioTransportista: p.precioTransportista?.trim() ?? "",
    cargaEnTramo: p.cargaEnTramo?.trim() ?? "",
    tipoMercanciaCarga: p.tipoMercanciaCarga?.trim() ?? "",
    tipoMercanciaDescarga: p.tipoMercanciaDescarga?.trim() ?? "",
    notas: p.notas?.trim() ?? "",
    responsabilidadEmbalaje: p.responsabilidadEmbalaje?.trim() ?? "",
    requisitosEspeciales: p.requisitosEspeciales?.trim() ?? "",
    tipoVehiculoRequerido: p.tipoVehiculoRequerido?.trim() ?? "",
    telefonoTransportista: p.telefonoTransportista?.trim() || undefined,
    transportInvitedStoreServiceId: p.transportInvitedStoreServiceId?.trim() ?? "",
    transportInvitedServiceSummary: p.transportInvitedServiceSummary?.trim() ?? "",
    monedaPago: p.monedaPago?.trim() ?? "",
  }));
}

/**
 * Tras limpiar cada fila con `tramosToLimpios`, asigna origen del tramo i al destino del i−1
 * salvo que el tramo i ya tenga par lat/lng de origen (definido en mapa).
 */
export function expandChainedTramoOrigins(
  tramos: RouteTramoFormInput[],
): RouteTramoFormInput[] {
  return tramos.map((t, i) => {
    if (i === 0) return t;
    const prev = tramos[i - 1];
    const lat = (t.origenLat ?? "").trim();
    const lng = (t.origenLng ?? "").trim();
    if (lat !== "" && lng !== "") {
      const name = (t.origen ?? "").trim();
      return {
        ...t,
        origen: name || prev.destino.trim(),
        origenLat: lat,
        origenLng: lng,
      };
    }
    return {
      ...t,
      origen: prev.destino.trim(),
      origenLat: (prev.destinoLat ?? "").trim(),
      origenLng: (prev.destinoLng ?? "").trim(),
    };
  });
}

/** Coordenadas + texto de dirección ya expandidos por cadena (mismo criterio que el mapa de destino). */
export type ExpandedTramoPlaceCoords = {
  lat: number;
  lng: number;
  placeLabel: string;
};

/** Destino del tramo `tramoIndex` (0-based) tras `expandChainedTramoOrigins`. */
export function expandedTramoDestinoCoords(
  tramos: RouteTramoFormInput[],
  tramoIndex: number,
): ExpandedTramoPlaceCoords | null {
  const limp = expandChainedTramoOrigins(tramosToLimpios(tramos));
  const t = limp[tramoIndex];
  if (!t) return null;
  const p = parseRouteLatLngInputPair(t.destinoLat ?? "", t.destinoLng ?? "");
  if (!p) return null;
  return {
    lat: p.lat,
    lng: p.lng,
    placeLabel: (t.destino ?? "").trim(),
  };
}

/** Origen del tramo `tramoIndex` (0-based) tras `expandChainedTramoOrigins`. */
export function expandedTramoOrigenCoords(
  tramos: RouteTramoFormInput[],
  tramoIndex: number,
): ExpandedTramoPlaceCoords | null {
  const limp = expandChainedTramoOrigins(tramosToLimpios(tramos));
  const t = limp[tramoIndex];
  if (!t) return null;
  const p = parseRouteLatLngInputPair(t.origenLat ?? "", t.origenLng ?? "");
  if (!p) return null;
  return {
    lat: p.lat,
    lng: p.lng,
    placeLabel: (t.origen ?? "").trim(),
  };
}

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

/**
 * Al elegir destino del tramo `tramoIndex` (0-based, tramo 1 = 0), devuelve polilínea
 * (origen del tramo 1, luego finales de tramos 1…k) y un marcador numerado 1…k en cada final ya definido.
 */
export function buildDestinoMapPriorContext(
  tramos: RouteTramoFormInput[],
  tramoIndex: number,
): DestinoMapPriorContext {
  const k = tramoIndex;
  if (k < 1 || tramos.length === 0) {
    return { routeSegments: [], segmentColors: [], linePositions: [], endMarkers: [] };
  }
  const limp = expandChainedTramoOrigins(tramosToLimpios(tramos));
  const routeSegments: [number, number][][] = [];
  const pseudoLegs: EmergentMapLeg[] = [];
  const endMarkers: { lat: number; lng: number; label: string }[] = [];
  for (let j = 0; j < k; j++) {
    const t = limp[j];
    if (!t) break;
    const o = parseRouteLatLngInputPair(t.origenLat ?? "", t.origenLng ?? "");
    const d = parseRouteLatLngInputPair(t.destinoLat ?? "", t.destinoLng ?? "");
    if (!o || !d) break;
    routeSegments.push([
      [o.lat, o.lng],
      [d.lat, d.lng],
    ]);
    pseudoLegs.push({
      orden: j + 1,
      label: String(j + 1),
      origen: t.origen?.trim() ?? "",
      destino: t.destino?.trim() ?? "",
      oLat: o.lat,
      oLng: o.lng,
      dLat: d.lat,
      dLng: d.lng,
      synthetic: false,
    });
    endMarkers.push({ lat: d.lat, lng: d.lng, label: String(j + 1) });
  }
  const segmentColors = emergentMapRouteSegmentColors(pseudoLegs);
  const linePositions = routeSegments.flat();
  return { routeSegments, segmentColors, linePositions, endMarkers };
}
