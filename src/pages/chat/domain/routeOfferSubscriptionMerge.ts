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
  const found = Object.entries(state.routeOfferPublic).find(([, ro]) => ro.threadId === thread.id);
  return found?.[0];
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
    if (!tramoLabel.includes(`Tramo ${items[i]!.orden}`)) tramoLabel = `${tramoLabel} · ${d}`;
  }
  const it0 = items[0]!;
  const display = it0.displayName?.trim() || "Transportista";
  const phone = it0.phone?.trim() ?? "";
  const label = it0.transportServiceLabel?.trim() || "No indicada en la suscripción";
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
      c.id !== uid ? c : { ...c, tramoLabel, phone: phone || c.phone, vehicleLabel: label || c.vehicleLabel },
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
    (x) => x.carrierUserId?.trim() === uid && x.routeSheetId?.trim() === ro.routeSheetId?.trim(),
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
    const status = raw === "confirmed" ? ("confirmed" as const) : ("pending" as const);
    const nextAsg = {
      userId: uid,
      displayName: sub.displayName?.trim() || "Transportista",
      phone: sub.phone?.trim() ?? "",
      trustScore: sub.trustScore ?? 0,
      ...(sub.transportServiceLabel?.trim() ?
        { vehicleLabel: sub.transportServiceLabel.trim() }
      : {}),
      ...(sub.storeServiceId?.trim() ? { storeServiceId: sub.storeServiceId.trim() } : {}),
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
 * Aplica filas del GET de suscripciones al estado local: oferta pública y chatCarriers del transportista.
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

  const mine = items.filter((x) => x.carrierUserId?.trim() === vid);
  const ro = resolveRouteOfferPublicForThread(state, thread);
  const key = routeOfferPublicKeyForThread(state, thread);

  let routeOfferPublic = state.routeOfferPublic;
  let threads = state.threads;

  if (ro && key) {
    const mergedRo = mergeTramoSubscriptionsIntoRouteOffer(ro, mine, vid);
    if (mergedRo && mergedRo !== ro) {
      routeOfferPublic = { ...state.routeOfferPublic, [key]: mergedRo };
    }
  }

  const confirmedMine = mine.filter((x) => x.status?.trim().toLowerCase() === "confirmed");
  if (confirmedMine.length) {
    const th0 = threads[tid] ?? thread;
    const roForCarrier = resolveRouteOfferPublicForThread({ ...state, routeOfferPublic }, th0);
    const nextCc = mergeChatCarriersForConfirmedItems(th0, confirmedMine, roForCarrier);
    threads = {
      ...threads,
      [tid]: { ...th0, chatCarriers: nextCc },
    };
  }

  if (routeOfferPublic === state.routeOfferPublic && threads === state.threads) return null;
  return { ...state, routeOfferPublic, threads };
}
