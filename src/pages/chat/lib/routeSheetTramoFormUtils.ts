import type { RouteTramoFormInput } from "../domain/routeSheetTypes";

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
  return {
    paradaId: undefined,
    origen: "",
    destino: "",
    origenLat: "",
    origenLng: "",
    destinoLat: "",
    destinoLng: "",
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
    monedaPago: "",
  };
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
    monedaPago: p.monedaPago?.trim() ?? "",
  }));
}

/**
 * Tras limpiar cada fila con `tramosToLimpios`, asigna origen del tramo i al destino ya normalizado del tramo i−1.
 */
export function expandChainedTramoOrigins(
  tramos: RouteTramoFormInput[],
): RouteTramoFormInput[] {
  return tramos.map((t, i) => {
    if (i === 0) return t;
    const prev = tramos[i - 1];
    return {
      ...t,
      origen: prev.destino.trim(),
      origenLat: (prev.destinoLat ?? "").trim(),
      origenLng: (prev.destinoLng ?? "").trim(),
    };
  });
}

export type DestinoMapPriorContext = {
  /** Origen t0, luego un vértice por tramo 0..k-1: destino de cada tramo (cadena de la ruta ya definida). */
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
    return { linePositions: [], endMarkers: [] };
  }
  const limp = expandChainedTramoOrigins(tramosToLimpios(tramos));
  const linePositions: [number, number][] = [];
  const endMarkers: { lat: number; lng: number; label: string }[] = [];
  const o0 = parseRouteLatLngInputPair(
    limp[0]?.origenLat ?? "",
    limp[0]?.origenLng ?? "",
  );
  if (!o0) {
    return { linePositions: [], endMarkers: [] };
  }
  linePositions.push([o0.lat, o0.lng]);
  for (let j = 0; j < k; j++) {
    const t = limp[j];
    if (!t) break;
    const d = parseRouteLatLngInputPair(t.destinoLat ?? "", t.destinoLng ?? "");
    if (!d) break;
    linePositions.push([d.lat, d.lng]);
    endMarkers.push({ lat: d.lat, lng: d.lng, label: String(j + 1) });
  }
  return { linePositions, endMarkers };
}
