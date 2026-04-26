import type { RouteSheet } from "../../pages/chat/domain/routeSheetTypes";
import type {
  Offer,
  RouteOfferPublicState,
  RouteOfferTramoPublic,
  Thread,
} from "../../app/store/marketStoreTypes";

/**
 * Construye el estado público de hoja de ruta a partir de la ficha API (`/offers/{id}/card`
 * o feed), cuando aún no existe entrada en `routeOfferPublic` (p. ej. enlace directo a `emo_…`).
 */
export function routeOfferPublicFromEmergentCardOffer(
  offer: Offer,
): RouteOfferPublicState | undefined {
  if (!offer.isEmergentRoutePublication) return undefined;
  const threadId = offer.emergentThreadId?.trim();
  const routeSheetId = offer.emergentRouteSheetId?.trim();
  const paradas = offer.emergentRouteParadas;
  if (!threadId || !routeSheetId || !paradas?.length) return undefined;

  const tramos: RouteOfferTramoPublic[] = paradas.flatMap((leg, i) => {
    const stopId = leg.stopId?.trim();
    if (!stopId) return [];
    const orden =
      typeof leg.orden === "number" && leg.orden > 0 ? leg.orden : i + 1;
    return [
      {
        stopId,
        orden,
        origenLine: leg.origen?.trim() || "—",
        destinoLine: leg.destino?.trim() || "—",
        origenLat: leg.origenLat,
        origenLng: leg.origenLng,
        destinoLat: leg.destinoLat,
        destinoLng: leg.destinoLng,
        precioTransportista: leg.precioTransportista,
        monedaPago: leg.monedaPago ?? offer.emergentMonedaPago,
      },
    ];
  });

  if (tramos.length === 0) return undefined;

  return {
    threadId,
    routeSheetId,
    routeTitle: offer.title?.trim() || "Hoja de ruta",
    tramos,
  };
}

/**
 * Aplica snapshot de ficha emergente sobre `routeOfferPublic` existente: actualiza `stopId` y líneas
 * desde la API sin perder campos enriquecidos ni asignaciones locales (emparejando por `orden`).
 */
export function mergeRouteOfferPublicFromEmergentCard(
  prev: RouteOfferPublicState | undefined,
  built: RouteOfferPublicState,
): RouteOfferPublicState {
  if (!prev?.tramos?.length) return built;
  const byOrden = new Map(prev.tramos.map((t) => [t.orden, t]));
  const tramos: RouteOfferTramoPublic[] = built.tramos.map((t) => {
    const p = byOrden.get(t.orden);
    if (!p) return t;
    return {
      ...p,
      ...t,
      ...(p.assignment ? { assignment: p.assignment } : {}),
    };
  });
  return {
    ...prev,
    ...built,
    tramos,
  };
}

/** Construye la vista pública de oferta de ruta desde la hoja ya cargada en el hilo (GET route-sheets). */
export function routeOfferPublicFromThreadRouteSheet(
  threadId: string,
  sheet: RouteSheet,
): RouteOfferPublicState {
  const tramos: RouteOfferTramoPublic[] = sheet.paradas.map((p) => ({
    stopId: p.id,
    orden: p.orden,
    origenLine: p.origen,
    destinoLine: p.destino,
    origenLat: p.origenLat?.trim() || undefined,
    origenLng: p.origenLng?.trim() || undefined,
    destinoLat: p.destinoLat?.trim() || undefined,
    destinoLng: p.destinoLng?.trim() || undefined,
    cargaEnTramo: p.cargaEnTramo?.trim() || undefined,
    tipoMercanciaCarga: p.tipoMercanciaCarga?.trim() || undefined,
    tipoMercanciaDescarga: p.tipoMercanciaDescarga?.trim() || undefined,
    tipoVehiculoRequerido: p.tipoVehiculoRequerido?.trim() || undefined,
    tiempoRecogidaEstimado: p.tiempoRecogidaEstimado?.trim() || undefined,
    tiempoEntregaEstimado: p.tiempoEntregaEstimado?.trim() || undefined,
    precioTransportista: p.precioTransportista?.trim() || undefined,
    notas: p.notas?.trim() || undefined,
    requisitosEspeciales: p.requisitosEspeciales?.trim() || undefined,
    telefonoTransportista: p.telefonoTransportista?.trim() || undefined,
    monedaPago: p.monedaPago?.trim() || undefined,
  }));
  return {
    threadId,
    routeSheetId: sheet.id,
    routeTitle: sheet.titulo,
    mercanciasResumen: sheet.mercanciasResumen,
    notasGenerales: sheet.notasGenerales,
    hojaEstado: sheet.estado,
    tramos,
  };
}

function pickRouteSheetForPublicHydration(
  thread: Thread,
  offer: Offer | undefined,
): RouteSheet | undefined {
  const sheets = thread.routeSheets ?? [];
  if (sheets.length === 0) return undefined;
  const emoRid = offer?.emergentRouteSheetId?.trim();
  if (emoRid) {
    const hit = sheets.find((x) => x.id === emoRid);
    if (hit) return hit;
  }
  const pub = sheets.find((x) => x.publicadaPlataforma);
  if (pub) return pub;
  return sheets[0];
}

/**
 * Al cargar el chat, `routeOfferPublic` suele estar vacío o solo bajo el id de catálogo (ficha),
 * mientras el hilo usa `offerId` = publicación `emo_*`. Sin esto, el modal y las suscripciones no resuelven oferta.
 */
export function mergedRouteOfferPublicAfterChatThreadHydration(
  routeOfferPublic: Record<string, RouteOfferPublicState>,
  thread: Thread,
  offer: Offer | undefined,
): Record<string, RouteOfferPublicState> | null {
  const oid = thread.offerId?.trim();
  if (!oid || !thread.id?.trim()) return null;

  let canonical: RouteOfferPublicState | undefined;
  if (offer) {
    const fromCard = routeOfferPublicFromEmergentCardOffer(offer);
    if (fromCard) {
      canonical = { ...fromCard, threadId: thread.id };
    }
  }
  if (!canonical) {
    const sheet = pickRouteSheetForPublicHydration(thread, offer);
    if (!sheet?.paradas?.length) return null;
    canonical = routeOfferPublicFromThreadRouteSheet(thread.id, sheet);
  }

  const keys = new Set<string>([oid]);
  const base = offer?.emergentBaseOfferId?.trim();
  if (base && base !== oid) keys.add(base);

  const next = { ...routeOfferPublic };
  for (const k of keys) {
    next[k] = mergeRouteOfferPublicFromEmergentCard(next[k], canonical);
  }
  return next;
}
