import type {
  MarketState,
  RouteOfferPublicState,
  RouteOfferTramoAssignment,
  Thread,
  ThreadChatCarrier,
} from "../../../app/store/marketStoreTypes";
import type { RouteTramoSubscriptionItemApi } from "../../../utils/chat/chatApi";
import {
  mergeRouteOfferPublicFromEmergentCard,
  routeOfferPublicFromThreadRouteSheet,
} from "../../../utils/market/routeOfferPublicFromEmergentCard";
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

function normSubStatus(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Elige la fila que debe pintarse en un tramo a partir del GET (una entrada por stopId). */
function pickSubscriptionRowForStop(
  rows: RouteTramoSubscriptionItemApi[],
): RouteTramoSubscriptionItemApi | undefined {
  if (!rows.length) return undefined;
  const active = rows.filter((x) => {
    const st = normSubStatus(x.status);
    return st !== "rejected" && st !== "withdrawn";
  });
  if (!active.length) return undefined;
  const confirmed = active.filter((x) => normSubStatus(x.status) === "confirmed");
  const pool = confirmed.length ? confirmed : active;
  return pool.sort((a, b) => b.createdAtUnixMs - a.createdAtUnixMs)[0];
}

function assignmentFromSubscriptionRow(
  sub: RouteTramoSubscriptionItemApi,
): RouteOfferTramoAssignment {
  const raw = normSubStatus(sub.status);
  const status =
    raw === "confirmed" ? ("confirmed" as const) : ("pending" as const);
  return {
    userId: sub.carrierUserId.trim(),
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
}

/**
 * Reconstruye asignaciones solo desde el GET del hilo (autoritativo).
 * Evita dejar “confirmado” u otro transportista en un tramo cuando ya no hay fila en servidor
 * (el merge incremental por transportista conservaba el `t` anterior).
 */
function rebuildRouteOfferAssignmentsFromThreadItems(
  ro: RouteOfferPublicState | undefined,
  items: RouteTramoSubscriptionItemApi[],
): RouteOfferPublicState | undefined {
  if (!ro) return ro;
  const rsid = ro.routeSheetId?.trim() ?? "";
  if (!rsid) return ro;
  const forSheet = items.filter((x) => x.routeSheetId?.trim() === rsid);
  const byStop = new Map<string, RouteTramoSubscriptionItemApi[]>();
  for (const it of forSheet) {
    const sid = it.stopId?.trim() ?? "";
    if (!sid) continue;
    const arr = byStop.get(sid) ?? [];
    arr.push(it);
    byStop.set(sid, arr);
  }
  let changed = false;
  const nextTramos = ro.tramos.map((t) => {
    const picked = pickSubscriptionRowForStop(byStop.get(t.stopId) ?? []);
    if (!picked) {
      if (t.assignment !== undefined) {
        changed = true;
        return { ...t, assignment: undefined };
      }
      return t;
    }
    const nextAsg = assignmentFromSubscriptionRow(picked);
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

/** Lista de integrantes transportista en el hilo: solo filas confirmadas del GET (retiros / withdrawn no entran). */
function buildChatCarriersFromConfirmedSubscriptionItems(
  confirmedItems: RouteTramoSubscriptionItemApi[],
  ro: RouteOfferPublicState | undefined,
): ThreadChatCarrier[] {
  if (!confirmedItems.length) return [];
  const byCarrier = new Map<string, RouteTramoSubscriptionItemApi[]>();
  for (const it of confirmedItems) {
    const c = it.carrierUserId?.trim();
    if (!c) continue;
    const arr = byCarrier.get(c) ?? [];
    arr.push(it);
    byCarrier.set(c, arr);
  }
  const seed = {
    id: "",
    offerId: "",
    storeId: "",
    store: {
      id: "",
      name: "",
      verified: false,
      categories: [] as string[],
      transportIncluded: false,
      trustScore: 0,
    },
    messages: [],
    chatCarriers: [],
  } satisfies Thread;
  let cc: ThreadChatCarrier[] = [];
  let acc: Thread = seed;
  for (const rows of byCarrier.values()) {
    cc = mergeChatCarriersForConfirmedItems({ ...acc, chatCarriers: cc }, rows, ro);
    acc = { ...acc, chatCarriers: cc };
  }
  return cc;
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
  const byStop = new Map(mine.map((x) => [x.stopId, x]));
  let changed = false;
  const nextTramos = ro.tramos.map((t) => {
    const sub = byStop.get(t.stopId);
    if (sub) {
      const raw = sub.status?.trim().toLowerCase() ?? "";
      if (raw === "rejected" || raw === "withdrawn") {
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
    }
    if (t.assignment?.userId === uid) {
      changed = true;
      return { ...t, assignment: undefined };
    }
    return t;
  });
  return changed ? { ...ro, tramos: nextTramos } : ro;
}

/**
 * Aplica filas del GET de suscripciones al estado local: oferta pública y chatCarriers.
 * — Oferta pública: comprador/vendedor y transportistas con tramo confirmado fusionan todos los transportistas (misma vista).
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

  let thread: Thread | undefined = state.threads[tid];
  if (!thread && items.length) {
    const rsid0 = (items[0]!.routeSheetId ?? "").trim();
    if (rsid0) {
      const roEntry = Object.entries(state.routeOfferPublic).find(
        ([, r]) => (r.routeSheetId ?? "").trim() === rsid0,
      );
      if (roEntry) {
        const [publicKey] = roEntry;
        const o = state.offers[publicKey];
        const storeId = (o?.storeId ?? "").trim();
        const st =
          storeId && state.stores[storeId] ?
            state.stores[storeId]!
          : {
              id: storeId,
              name: "",
              verified: false,
              categories: [] as string[],
              transportIncluded: false,
              trustScore: 0,
            };
        thread = {
          id: tid,
          offerId: publicKey,
          storeId: storeId || st.id,
          store: st,
          messages: [],
        };
      }
    }
  }
  if (!thread) return null;

  if (items.length === 0) {
    const th0 = state.threads[tid] ?? thread;
    const roCheck = resolveRouteOfferPublicForThread(state, th0);
    if (
      (th0.chatCarriers?.length ?? 0) > 0 ||
      (roCheck?.tramos?.some((t) => t.assignment != null) ?? false)
    ) {
      return null;
    }
  }

  let routeOfferPublic = state.routeOfferPublic;
  let ro = resolveRouteOfferPublicForThread(state, thread);
  let key = routeOfferPublicKeyForThread(state, thread);

  if ((!ro || !key) && items.length > 0) {
    const thFull = state.threads[tid] ?? thread;
    const rsid = (items[0]!.routeSheetId ?? "").trim();
    const sheet = thFull.routeSheets?.find((r) => r.id === rsid);
    const oid = thFull.offerId?.trim();
    if (sheet?.paradas?.length && oid) {
      const synthetic = routeOfferPublicFromThreadRouteSheet(tid, sheet);
      const mergedSeed = mergeRouteOfferPublicFromEmergentCard(
        undefined,
        synthetic,
      );
      routeOfferPublic = { ...routeOfferPublic, [oid]: mergedSeed };
      const stateSeeded = { ...state, routeOfferPublic };
      ro = resolveRouteOfferPublicForThread(stateSeeded, thFull);
      key = routeOfferPublicKeyForThread(stateSeeded, thFull);
    }
  }

  let threads = state.threads;

  if (ro && key) {
    const base = rebuildRouteOfferAssignmentsFromThreadItems(ro, items) ?? ro;
    // Alinear con el hilo de GET /threads/:id/… (p. ej. cth_ nuevo tras reabrir chat en la misma oferta).
    const withTid = { ...base, threadId: tid };
    routeOfferPublic = { ...routeOfferPublic, [key]: withTid };
  }

  const confirmedAll = items.filter(
    (x) => x.status?.trim().toLowerCase() === "confirmed",
  );
  const th0 = threads[tid] ?? thread;
  const roForCarrier = resolveRouteOfferPublicForThread(
    { ...state, routeOfferPublic },
    th0,
  );
  const ccNext = buildChatCarriersFromConfirmedSubscriptionItems(
    confirmedAll,
    roForCarrier,
  );
  threads = {
    ...threads,
    [tid]: { ...th0, chatCarriers: ccNext },
  };

  if (routeOfferPublic === state.routeOfferPublic && threads === state.threads)
    return null;
  return { ...state, routeOfferPublic, threads };
}
