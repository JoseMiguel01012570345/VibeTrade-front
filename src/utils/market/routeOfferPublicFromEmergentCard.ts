import type {
  Offer,
  RouteOfferPublicState,
  RouteOfferTramoPublic,
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
