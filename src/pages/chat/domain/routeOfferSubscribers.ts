import type {
  RouteOfferPublicState,
  RouteOfferTramoAssignment,
  RouteOfferTramoPublic,
} from "../../../app/store/marketStoreTypes";
import type { RouteTramoSubscriptionItemApi } from "../../../utils/chat/chatApi";

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
  storeServiceId?: string;
  /** Tienda del servicio (enlace a vitrina / servicios). */
  carrierServiceStoreId?: string;
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

/** Agrupa respuesta del API de suscripciones por transportista para el mismo visor que el estado local. */
export function subscribersFromApiRouteTramoItems(
  items: RouteTramoSubscriptionItemApi[],
  routeSheetId: string,
): RouteOfferSubscriberSummary[] {
  const sid = routeSheetId.trim();
  const filtered = items.filter((x) => x.routeSheetId?.trim() === sid);
  const byUser = new Map<string, RouteOfferSubscriberSummary>();

  for (const it of filtered) {
    const uid = it.carrierUserId?.trim();
    if (!uid) continue;
    const raw = it.status?.trim().toLowerCase() ?? "";
    if (raw === "rejected") continue;
    const st = raw === "confirmed" ? ("confirmed" as const) : ("pending" as const);
    const tr: RouteOfferSubscriberTramo = {
      stopId: it.stopId,
      orden: it.orden,
      status: st,
      origenLine: it.origenLine?.trim() || "—",
      destinoLine: it.destinoLine?.trim() || "—",
    };
    const label = it.transportServiceLabel?.trim();
    const svcId = it.storeServiceId?.trim();
    const svcStore = it.carrierServiceStoreId?.trim();
    const cur = byUser.get(uid);
    if (!cur) {
      byUser.set(uid, {
        userId: uid,
        displayName: it.displayName?.trim() || "Transportista",
        phone: it.phone?.trim() ?? "",
        trustScore: it.trustScore ?? 0,
        ...(label ? { transportServiceLabel: label } : {}),
        ...(svcId ? { storeServiceId: svcId } : {}),
        ...(svcStore ? { carrierServiceStoreId: svcStore } : {}),
        tramos: [tr],
      });
    } else {
      cur.tramos.push(tr);
      if (!cur.transportServiceLabel && label) cur.transportServiceLabel = label;
      if (!cur.storeServiceId && svcId) cur.storeServiceId = svcId;
      if (!cur.carrierServiceStoreId && svcStore) cur.carrierServiceStoreId = svcStore;
    }
  }

  return [...byUser.values()].sort((x, y) =>
    x.displayName.localeCompare(y.displayName, "es", { sensitivity: "base" }),
  );
}
