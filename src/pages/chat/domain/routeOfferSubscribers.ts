import type {
  RouteOfferPublicState,
  RouteOfferTramoAssignment,
  RouteOfferTramoPublic,
} from "../../../app/store/marketStoreTypes";
import type { RouteTramoSubscriptionItemApi } from "../../../utils/chat/chatApi";

export type RouteOfferSubscriberTramo = {
  routeSheetId: string;
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
      routeSheetId: routeSheetId,
      stopId: t.stopId,
      orden: t.orden,
      status: a.status,
      origenLine: t.origenLine,
      destinoLine: t.destinoLine,
    };
    const label = a.vehicleLabel?.trim();
    const svcId = a.storeServiceId?.trim();
    if (!cur) {
      byUser.set(a.userId, {
        userId: a.userId,
        displayName: a.displayName,
        phone: a.phone,
        trustScore: a.trustScore,
        ...(label ? { transportServiceLabel: label } : {}),
        ...(svcId ? { storeServiceId: svcId } : {}),
        tramos: [tr],
      });
      return;
    }
    cur.tramos.push(tr);
    if (!cur.transportServiceLabel && label) cur.transportServiceLabel = label;
    if (!cur.storeServiceId && svcId) cur.storeServiceId = svcId;
  };

  for (const t of routeOffer.tramos) {
    const a = t.assignment;
    if (a && (a.status === "pending" || a.status === "confirmed")) ingest(t, a);
  }

  return [...byUser.values()].sort((x, y) =>
    x.displayName.localeCompare(y.displayName, "es", { sensitivity: "base" }),
  );
}

/** Unión de la oferta local en todas las hojas del hilo (misma oferta pública o vacío por hoja). */
export function collectRouteOfferSubscribersForThreadSheets(
  routeOffer: RouteOfferPublicState | undefined,
  routeSheets: { id: string }[],
): RouteOfferSubscriberSummary[] {
  const byUser = new Map<string, RouteOfferSubscriberSummary>();
  for (const sh of routeSheets) {
    for (const sub of collectRouteOfferSubscribersForSheet(routeOffer, sh.id)) {
      const cur = byUser.get(sub.userId);
      if (!cur) {
        byUser.set(sub.userId, { ...sub, tramos: [...sub.tramos] });
        continue;
      }
      cur.tramos.push(...sub.tramos);
      if (!cur.transportServiceLabel && sub.transportServiceLabel) {
        cur.transportServiceLabel = sub.transportServiceLabel;
      }
      if (!cur.storeServiceId && sub.storeServiceId) cur.storeServiceId = sub.storeServiceId;
      if (!cur.carrierServiceStoreId && sub.carrierServiceStoreId) {
        cur.carrierServiceStoreId = sub.carrierServiceStoreId;
      }
    }
  }
  return [...byUser.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" }),
  );
}

export type RouteSheetMetaEntry = { id: string; titulo: string };

/**
 * Orden y títulos para el visor: prioriza GET /route-sheets, completa con el hilo en memoria
 * y con los `routeSheetId` de las suscripciones (si el store del chat no estaba al día).
 */
export function buildRouteSheetsMetaForGrouping(
  apiSheets: ReadonlyArray<{ id: string; titulo?: string }> | null,
  threadRouteSheets: ReadonlyArray<{ id: string; titulo: string }>,
  subscriptionApiItems: ReadonlyArray<{ routeSheetId: string }>,
): RouteSheetMetaEntry[] {
  const byId = new Map<string, string>();
  const fromApi = apiSheets ?? [];
  for (const r of fromApi) {
    const id = r.id?.trim();
    if (!id) continue;
    const t = (r.titulo ?? "Hoja de ruta").trim() || "Hoja de ruta";
    byId.set(id, t);
  }
  for (const p of threadRouteSheets) {
    const id = p.id?.trim();
    if (!id) continue;
    if (!byId.has(id)) {
      byId.set(id, (p.titulo ?? "Hoja de ruta").trim() || "Hoja de ruta");
    }
  }
  for (const it of subscriptionApiItems) {
    const id = it.routeSheetId?.trim();
    if (id && !byId.has(id)) byId.set(id, "Hoja de ruta");
  }
  const ordered: string[] = [];
  for (const r of fromApi) {
    const id = r.id?.trim();
    if (id && byId.has(id) && !ordered.includes(id)) ordered.push(id);
  }
  for (const p of threadRouteSheets) {
    const id = p.id?.trim();
    if (id && byId.has(id) && !ordered.includes(id)) ordered.push(id);
  }
  for (const id of byId.keys()) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered.map((id) => ({ id, titulo: byId.get(id) ?? "Hoja de ruta" }));
}

/** Agrupa respuesta del API de suscripciones por transportista para el mismo visor que el estado local. */
export function subscribersFromApiRouteTramoItems(
  items: RouteTramoSubscriptionItemApi[],
  routeSheetId?: string,
): RouteOfferSubscriberSummary[] {
  const sid = routeSheetId?.trim();
  const filtered = sid
    ? items.filter((x) => x.routeSheetId?.trim() === sid)
    : items;
  const byUser = new Map<string, RouteOfferSubscriberSummary>();

  for (const it of filtered) {
    const uid = it.carrierUserId?.trim();
    if (!uid) continue;
    const raw = it.status?.trim().toLowerCase() ?? "";
    if (raw === "rejected" || raw === "withdrawn") continue;
    const st = raw === "confirmed" ? ("confirmed" as const) : ("pending" as const);
    const tr: RouteOfferSubscriberTramo = {
      routeSheetId: it.routeSheetId?.trim() ?? "",
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

/** Tramo de la hoja con los transportistas que tienen suscripción en ese tramo. */
export type RouteOfferTramoSubscriberGroup = {
  routeSheetId: string;
  stopId: string;
  orden: number;
  origenLine: string;
  destinoLine: string;
  carriers: RouteOfferSubscriberSummary[];
};

export type RouteSheetSubscriberSection = {
  routeSheetId: string;
  titulo: string;
  tramoGroups: RouteOfferTramoSubscriberGroup[];
};

/**
 * Suscriptores filtrados a una sola hoja de ruta (cada tramo en `tramos` comparte el mismo `routeSheetId`).
 */
export function subscribersForOneRouteSheet(
  subscribers: RouteOfferSubscriberSummary[],
  routeSheetId: string,
): RouteOfferSubscriberSummary[] {
  const sid = routeSheetId.trim();
  const out: RouteOfferSubscriberSummary[] = [];
  for (const sub of subscribers) {
    const trs = sub.tramos.filter((t) => t.routeSheetId === sid);
    if (trs.length === 0) continue;
    out.push({ ...sub, tramos: trs });
  }
  return out.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" }),
  );
}

/**
 * Agrupa suscriptores por hoja y luego por tramo: route-sheet → stop → suscriptores.
 * Incluye **todas** las hojas de `routeSheetsMeta` aunque no haya filas de suscripción aún,
 * para que el visor no oculte hojas en borrador o sin actividad.
 */
export function groupSubscribersByRouteSheetThenTramo(
  subscribers: RouteOfferSubscriberSummary[],
  routeSheetsMeta: { id: string; titulo: string }[],
): RouteSheetSubscriberSection[] {
  const sheetIdsFromSubs = new Set<string>();
  for (const sub of subscribers) {
    for (const tr of sub.tramos) {
      const id = tr.routeSheetId?.trim();
      if (id) sheetIdsFromSubs.add(id);
    }
  }
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const m of routeSheetsMeta) {
    const id = m.id.trim();
    if (!id || seen.has(id)) continue;
    ordered.push(id);
    seen.add(id);
  }
  for (const id of sheetIdsFromSubs) {
    if (!seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }
  return ordered.map((rid) => {
    const titulo =
      routeSheetsMeta.find((m) => m.id === rid)?.titulo?.trim() || "Hoja de ruta";
    const slice = subscribersForOneRouteSheet(subscribers, rid);
    return {
      routeSheetId: rid,
      titulo,
      tramoGroups: groupSubscribersByTramo(slice, rid),
    };
  });
}

/**
 * Agrupa suscriptores por tramo (stopId) dentro de una hoja. Cada transportista aparece una vez por tramo.
 */
export function groupSubscribersByTramo(
  subscribers: RouteOfferSubscriberSummary[],
  routeSheetId: string,
): RouteOfferTramoSubscriberGroup[] {
  const map = new Map<
    string,
    { orden: number; origenLine: string; destinoLine: string; carriers: RouteOfferSubscriberSummary[] }
  >();

  for (const sub of subscribers) {
    for (const tr of sub.tramos) {
      let g = map.get(tr.stopId);
      if (!g) {
        g = {
          orden: tr.orden,
          origenLine: tr.origenLine,
          destinoLine: tr.destinoLine,
          carriers: [],
        };
        map.set(tr.stopId, g);
      } else if (tr.orden < g.orden) {
        g.orden = tr.orden;
      }
      if (!g.carriers.some((c) => c.userId === sub.userId)) {
        g.carriers.push(sub);
      }
    }
  }

  for (const g of map.values()) {
    g.carriers.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" }),
    );
  }

  return [...map.entries()]
    .map(([stopId, v]) => ({ routeSheetId, stopId, ...v }))
    .sort((a, b) => a.orden - b.orden || a.stopId.localeCompare(b.stopId));
}
