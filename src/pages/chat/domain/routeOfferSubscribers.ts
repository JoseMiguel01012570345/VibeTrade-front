import type {
  RouteOfferPublicState,
  RouteOfferTramoAssignment,
  RouteOfferTramoPublic,
} from "../../../app/store/marketStoreTypes";

export type RouteOfferSubscriberTramo = {
  stopId: string;
  orden: number;
  status: RouteOfferTramoAssignment["status"];
  origenLine: string;
  destinoLine: string;
};

export type RouteOfferSubscriberSummary = {
  userId: string;
  displayName: string;
  phone: string;
  trustScore: number;
  /** Etiqueta del servicio de transporte elegido al suscribirse (en store se guarda como `vehicleLabel`). */
  transportServiceLabel?: string;
  tramos: RouteOfferSubscriberTramo[];
};

/**
 * Agrupa transportistas que figuran en la oferta pública de la hoja (pending o confirmed).
 */
export function collectRouteOfferSubscribersForSheet(
  routeOffer: RouteOfferPublicState | undefined,
  routeSheetId: string,
): RouteOfferSubscriberSummary[] {
  if (!routeOffer || routeOffer.routeSheetId !== routeSheetId || !routeOffer.tramos?.length) {
    return [];
  }

  const byUser = new Map<string, RouteOfferSubscriberSummary>();

  const ingest = (t: RouteOfferTramoPublic, a: RouteOfferTramoAssignment) => {
    const cur = byUser.get(a.userId);
    const tr: RouteOfferSubscriberTramo = {
      stopId: t.stopId,
      orden: t.orden,
      status: a.status,
      origenLine: t.origenLine,
      destinoLine: t.destinoLine,
    };
    const label = a.vehicleLabel?.trim();
    if (!cur) {
      byUser.set(a.userId, {
        userId: a.userId,
        displayName: a.displayName,
        phone: a.phone,
        trustScore: a.trustScore,
        ...(label ? { transportServiceLabel: label } : {}),
        tramos: [tr],
      });
      return;
    }
    cur.tramos.push(tr);
    if (!cur.transportServiceLabel && label) cur.transportServiceLabel = label;
  };

  for (const t of routeOffer.tramos) {
    const a = t.assignment;
    if (a && (a.status === "pending" || a.status === "confirmed")) ingest(t, a);
  }

  return [...byUser.values()].sort((x, y) =>
    x.displayName.localeCompare(y.displayName, "es", { sensitivity: "base" }),
  );
}
