import type {
  MarketState,
  RouteOfferPublicState,
  Thread,
  ThreadChatCarrier,
} from "../../../app/store/marketStoreTypes";
import type { RouteTramoSubscriptionItemApi } from "../../../utils/chat/chatApi";
import { resolveRouteOfferPublicForThread } from "./routeSheetOfferGuards";

function routeOfferPublicKeyForThread(
  state: Pick<MarketState, "routeOfferPublic" | "offers" | "threads">,
  thread: Thread,
): string | undefined {
  if (state.routeOfferPublic[thread.offerId]) return thread.offerId;
  const offer = state.offers[thread.offerId];
  const base = offer?.emergentBaseOfferId?.trim();
  if (base && state.routeOfferPublic[base]) return base;
  const found = Object.entries(state.routeOfferPublic).find(
    ([, ro]) => ro.threadId === thread.id,
  );
  return found?.[0];
}

function viewerIsBuyerOrSellerForThread(
  thread: Thread,
  viewerId: string,
): boolean {
  const v = viewerId.trim();
  if (!v) return false;
  if (thread.buyerUserId?.trim() === v) return true;
  const sellerUid =
    thread.sellerUserId?.trim() || thread.store?.ownerUserId?.trim();
  return sellerUid === v;
}

/** Comprador/vendedor: fusionar filas de todos los transportistas en la misma hoja (GET lista completa). */
function mergeTramoSubscriptionsIntoRouteOfferForAllCarriers(
  ro: RouteOfferPublicState | undefined,
  items: RouteTramoSubscriptionItemApi[],
): RouteOfferPublicState | undefined {
  if (!ro) return ro;
  const rsid = ro.routeSheetId?.trim() ?? "";
  if (!rsid) return ro;
  const carrierIds = [
    ...new Set(
      items
        .filter((x) => x.routeSheetId?.trim() === rsid)
        .map((x) => x.carrierUserId?.trim())
        .filter((c): c is string => !!c?.length),
    ),
  ].sort();
  let merged: RouteOfferPublicState = ro;
  let changed = false;
  for (const cid of carrierIds) {
    const next = mergeTramoSubscriptionsIntoRouteOffer(merged, items, cid);
    if (next !== undefined && next !== merged) {
      merged = next;
      changed = true;
    }
  }
  return changed ? merged : ro;
}

function tramoDescFromItem(
  it: RouteTramoSubscriptionItemApi,
  ro: RouteOfferPublicState | undefined,
): string {
  const t = ro?.tramos.find((x) => x.stopId === it.stopId);
  if (t) return `Tramo ${t.orden} (${t.origenLine} → ${t.destinoLine})`;
  return `Tramo ${it.orden}: ${it.origenLine} → ${it.destinoLine}`;
}

function mergeChatCarriersForConfirmedItems(
  thread: Thread,
  items: RouteTramoSubscriptionItemApi[],
  ro: RouteOfferPublicState | undefined,
): ThreadChatCarrier[] {
  if (!items.length) return thread.chatCarriers ?? [];
  const uid = items[0]!.carrierUserId!.trim();
  let chatCarriers = [...(thread.chatCarriers ?? [])];
  const tramoDescs = items.map((it) => tramoDescFromItem(it, ro));
  let tramoLabel = tramoDescs[0]!;
  for (let i = 1; i < tramoDescs.length; i++) {
    const d = tramoDescs[i]!;
    if (!tramoLabel.includes(`Tramo ${items[i]!.orden}`))
      tramoLabel = `${tramoLabel} · ${d}`;
  }
  const it0 = items[0]!;
  const display = it0.displayName?.trim() || "Transportista";
  const phone = it0.phone?.trim() ?? "";
  const label =
    it0.transportServiceLabel?.trim() || "No indicada en la suscripción";
  const had = chatCarriers.some((c) => c.id === uid);
  if (!had) {
    chatCarriers.push({
      id: uid,
      name: display,
      phone,
      trustScore: it0.trustScore ?? 0,
      vehicleLabel: label,
      tramoLabel,
    });
  } else {
    chatCarriers = chatCarriers.map((c) =>
      c.id !== uid
        ? c
        : {
            ...c,
            tramoLabel,
            phone: phone || c.phone,
            vehicleLabel: label || c.vehicleLabel,
          },
    );
  }
  return chatCarriers;
}

export function mergeTramoSubscriptionsIntoRouteOffer(
  ro: RouteOfferPublicState | undefined,
  items: RouteTramoSubscriptionItemApi[],
  carrierUserId: string,
): RouteOfferPublicState | undefined {
  if (!ro) return ro;
  const uid = carrierUserId.trim();
  const mine = items.filter(
    (x) =>
      x.carrierUserId?.trim() === uid &&
      x.routeSheetId?.trim() === ro.routeSheetId?.trim(),
  );
  if (!mine.length) return ro;

  const byStop = new Map(mine.map((x) => [x.stopId, x]));
  let changed = false;
  const nextTramos = ro.tramos.map((t) => {
    const sub = byStop.get(t.stopId);
    if (!sub) return t;
    const raw = sub.status?.trim().toLowerCase() ?? "";
    if (raw === "rejected") {
      const cur = t.assignment;
      if (cur?.userId === uid) {
        changed = true;
        return { ...t, assignment: undefined };
      }
      return t;
    }
    const status =
      raw === "confirmed" ? ("confirmed" as const) : ("pending" as const);
    const nextAsg = {
      userId: uid,
      displayName: sub.displayName?.trim() || "Transportista",
      phone: sub.phone?.trim() ?? "",
      trustScore: sub.trustScore ?? 0,
      ...(sub.transportServiceLabel?.trim()
        ? { vehicleLabel: sub.transportServiceLabel.trim() }
        : {}),
      ...(sub.storeServiceId?.trim()
        ? { storeServiceId: sub.storeServiceId.trim() }
        : {}),
      status,
    };
    const cur = t.assignment;
    if (
      cur?.userId === nextAsg.userId &&
      cur.status === nextAsg.status &&
      cur.phone === nextAsg.phone &&
      cur.displayName === nextAsg.displayName &&
      (cur.vehicleLabel ?? "") === (nextAsg.vehicleLabel ?? "") &&
      (cur.storeServiceId ?? "") === (nextAsg.storeServiceId ?? "")
    ) {
      return t;
    }
    changed = true;
    return { ...t, assignment: nextAsg };
  });
  return changed ? { ...ro, tramos: nextTramos } : ro;
}

/**
 * Aplica filas del GET de suscripciones al estado local: oferta pública y chatCarriers.
 * — Oferta pública: comprador/vendedor fusionan todos los transportistas; el transportista solo sus filas (`mine`).
 * — Integrantes (chatCarriers): todos los confirmados en el hilo, misma lista para cualquier rol (el GET incluye confirmados ajenos si sos transportista).
 */
export function applyViewerRouteTramoSubscriptions(
  state: MarketState,
  threadId: string,
  items: RouteTramoSubscriptionItemApi[],
  viewerId: string,
): MarketState | null {
  const vid = viewerId.trim();
  const tid = threadId.trim();
  if (!vid || !tid) return null;

  const thread = state.threads[tid];
  if (!thread) return null;

  const buyerOrSeller = viewerIsBuyerOrSellerForThread(thread, vid);
  const mine = items.filter((x) => x.carrierUserId?.trim() === vid);
  const ro = resolveRouteOfferPublicForThread(state, thread);
  const key = routeOfferPublicKeyForThread(state, thread);

  let routeOfferPublic = state.routeOfferPublic;
  let threads = state.threads;

  if (ro && key) {
    if (buyerOrSeller) {
      const mergedRo = mergeTramoSubscriptionsIntoRouteOfferForAllCarriers(
        ro,
        items,
      );
      if (mergedRo !== undefined && mergedRo !== ro) {
        routeOfferPublic = { ...state.routeOfferPublic, [key]: mergedRo };
      }
    } else {
      const mergedRo = mergeTramoSubscriptionsIntoRouteOffer(ro, mine, vid);
      if (mergedRo && mergedRo !== ro) {
        routeOfferPublic = { ...state.routeOfferPublic, [key]: mergedRo };
      }
    }
  }

  const confirmedAll = items.filter(
    (x) => x.status?.trim().toLowerCase() === "confirmed",
  );
  if (confirmedAll.length) {
    const th0 = threads[tid] ?? thread;
    const roForCarrier = resolveRouteOfferPublicForThread(
      { ...state, routeOfferPublic },
      th0,
    );
    let cc = th0.chatCarriers ?? [];
    const byCarrier = new Map<string, RouteTramoSubscriptionItemApi[]>();
    for (const it of confirmedAll) {
      const c = it.carrierUserId?.trim();
      if (!c) continue;
      const arr = byCarrier.get(c) ?? [];
      arr.push(it);
      byCarrier.set(c, arr);
    }
    let thAcc = th0;
    for (const rows of byCarrier.values()) {
      cc = mergeChatCarriersForConfirmedItems(
        { ...thAcc, chatCarriers: cc },
        rows,
        roForCarrier,
      );
      thAcc = { ...thAcc, chatCarriers: cc };
    }
    threads = {
      ...threads,
      [tid]: { ...th0, chatCarriers: cc },
    };
  }

  if (routeOfferPublic === state.routeOfferPublic && threads === state.threads)
    return null;
  return { ...state, routeOfferPublic, threads };
}
