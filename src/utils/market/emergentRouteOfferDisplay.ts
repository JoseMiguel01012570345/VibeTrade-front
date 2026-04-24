import type { Offer, RouteOfferPublicState } from "../../app/store/marketStoreTypes";

function routeLegSummaryParts(
  offer: Offer,
  routeOffer: RouteOfferPublicState | undefined,
): string[] {
  if (routeOffer?.tramos?.length) {
    return routeOffer.tramos
      .filter((t) => t.origenLine.trim() && t.destinoLine.trim())
      .map((t) => `${t.origenLine.trim()} → ${t.destinoLine.trim()}`);
  }
  const p = offer.emergentRouteParadas;
  if (!p?.length) return [];
  return p
    .filter((leg) => leg.origen?.trim() && leg.destino?.trim())
    .map((leg) => `${leg.origen.trim()} → ${leg.destino.trim()}`);
}

/**
 * Texto de descripción de vitrina sin el resumen automático de tramos que arma el backend
 * (evita repetir bajo el título lo que ya muestra el mapa).
 */
export function emergentRoutePublicationUserDescription(
  offer: Offer,
  routeOffer: RouteOfferPublicState | undefined,
): string {
  const raw = offer.description?.trim() ?? "";
  if (!offer.isEmergentRoutePublication || !raw) return raw;
  const legs = routeLegSummaryParts(offer, routeOffer);
  if (legs.length === 0) return raw;
  const routeOnly = legs.join(" · ");
  if (raw === routeOnly) return "";
  if (raw.startsWith(routeOnly + "\n\n")) return raw.slice(routeOnly.length + 2).trim();

  const blocks = raw.split(/\n\n+/);
  const first = (blocks[0] ?? "").trim();
  if (first === routeOnly) return blocks.slice(1).join("\n\n").trim();

  const coversAll = legs.every((leg) => first.includes(leg));
  if (coversAll && blocks.length > 1) return blocks.slice(1).join("\n\n").trim();
  if (coversAll && blocks.length === 1) return "";

  return raw;
}
