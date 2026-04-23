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

  const pubId = offer.id?.trim() || "emo";
  const tramos: RouteOfferTramoPublic[] = paradas.map((leg, i) => ({
    stopId: `${pubId}-leg-${i}`,
    orden: i + 1,
    origenLine: leg.origen?.trim() || "—",
    destinoLine: leg.destino?.trim() || "—",
    origenLat: leg.origenLat,
    origenLng: leg.origenLng,
    destinoLat: leg.destinoLat,
    destinoLng: leg.destinoLng,
    precioTransportista: leg.precioTransportista,
    monedaPago: leg.monedaPago ?? offer.emergentMonedaPago,
  }));

  return {
    threadId,
    routeSheetId,
    routeTitle: offer.title?.trim() || "Hoja de ruta",
    tramos,
  };
}
