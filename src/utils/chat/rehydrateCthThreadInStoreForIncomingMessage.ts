import type { RouteSheetPayload } from "../../pages/chat/domain/routeSheetTypes";
import type { Offer, Thread } from "../../app/store/marketStoreTypes";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import {
  buildPurchaseThreadSystemOnly,
  syncOwnQaIntoMessages,
} from "../../app/store/marketStoreHelpers";
import { mapTradeAgreementApiToTradeAgreement } from "./tradeAgreementApiMapper";
import {
  mapChatMessageDtoToMessage,
  mergePersistedChatMessages,
} from "./chatMerge";
import {
  mergeBuyerLabelFromThreadDto,
  mergeChatSenderLabelsIntoProfileStore,
} from "./chatSenderLabels";
import {
  fetchChatMessages,
  fetchChatThread,
  fetchThreadRouteSheets,
  fetchThreadRouteTramoSubscriptions,
  fetchThreadTradeAgreements,
} from "./chatApi";
import { getSessionToken } from "../http/sessionToken";
import { fetchPublicOfferCard } from "../market/marketPersistence";
import { peerPartyExitFromDto } from "./threadPeerPartyExit";
import { minimalOfferStoreFromChatThreadDto } from "./chatThreadDtoFallbacks";

function resolveOffer(
  offerById: Record<string, Offer | undefined>,
  serverOfferId: string,
): Offer | undefined {
  const direct = offerById[serverOfferId];
  if (direct) return direct;
  return Object.values(offerById).find((o): o is Offer => {
    if (!o) return false;
    return (
      (o as { emergentBaseOfferId?: string }).emergentBaseOfferId?.trim() ===
      serverOfferId
    );
  });
}

/**
 * SignalR can deliver a message for a `cth_` thread before the in-memory
 * `threads` map has the row. Fetch thread + messages + acuerdos + hojas and
 * merge like `ensureThreadForOffer` / `applyHydratedThread` so a subsequent
 * push (or a full list from GET) is consistent.
 */
export async function rehydrateCthThreadInStoreForIncomingMessage(
  threadId: string,
): Promise<boolean> {
  if (!threadId.startsWith("cth_") || !getSessionToken()) return false;

  let dto;
  let serverMsgs;
  let agreements;
  let routeSheets: RouteSheetPayload[] = [];
  try {
    [dto, serverMsgs, agreements, routeSheets] = await Promise.all([
      fetchChatThread(threadId),
      fetchChatMessages(threadId),
      fetchThreadTradeAgreements(threadId).catch(() => []),
      fetchThreadRouteSheets(threadId).catch(() => [] as RouteSheetPayload[]),
    ]);
  } catch {
    return false;
  }

  let s = useMarketStore.getState();
  let offer = resolveOffer(s.offers, dto.offerId);
  let store = s.stores[dto.storeId];
  if (!offer || !store) {
    const card = await fetchPublicOfferCard(dto.offerId).catch(() => null);
    if (card?.offer?.id) {
      const storeKey = card.store.id?.trim() || card.offer.storeId;
      useMarketStore.setState((st) => {
        const nextStores = { ...st.stores };
        if (storeKey) {
          nextStores[storeKey] = {
            ...st.stores[storeKey],
            ...card.store,
            id: storeKey,
          };
        }
        return {
          ...st,
          offers: { ...st.offers, [card.offer.id]: card.offer },
          stores: nextStores,
        };
      });
      s = useMarketStore.getState();
      offer = resolveOffer(s.offers, dto.offerId);
      store = s.stores[dto.storeId];
    }
  }
  if (!offer || !store) {
    const { offer: fo, store: st } = minimalOfferStoreFromChatThreadDto(dto);
    useMarketStore.setState((st0) => ({
      ...st0,
      offers: { ...st0.offers, [fo.id]: fo },
      stores: { ...st0.stores, [st.id]: st },
    }));
    s = useMarketStore.getState();
    offer = resolveOffer(s.offers, dto.offerId);
    store = s.stores[dto.storeId];
  }
  if (!offer || !store) return false;

  const meId = useAppStore.getState().me.id;
  const threadCatalogId =
    (offer as { emergentBaseOfferId?: string }).emergentBaseOfferId?.trim() ||
    offer.id;

  const existing = Object.values(s.threads).find(
    (t) => t.offerId === threadCatalogId,
  );

  const bootstrap: Thread = existing
    ? { ...existing, id: dto.id }
    : {
        id: dto.id,
        offerId: threadCatalogId,
        storeId: offer.storeId,
        store,
        purchaseMode: dto.purchaseMode,
        messages: dto.purchaseMode
          ? buildPurchaseThreadSystemOnly(offer)
          : [],
        contracts: [],
        routeSheets: [],
      };

  const contracts = agreements.map(mapTradeAgreementApiToTradeAgreement);
  mergeChatSenderLabelsIntoProfileStore(serverMsgs);
  mergeBuyerLabelFromThreadDto(dto);

  const mapped = serverMsgs.map((d) => mapChatMessageDtoToMessage(d, meId));
  const validAgreementIds = new Set(contracts.map((c) => c.id));
  const mergedMsgs = mergePersistedChatMessages(mapped, bootstrap.messages, {
    validTradeAgreementIds: validAgreementIds,
  });
  const sellerUserId = dto.sellerUserId?.trim() || store.ownerUserId;
  const threadBuyerId = dto.buyerUserId?.trim() || bootstrap.buyerUserId;
  const qaSynced = syncOwnQaIntoMessages(
    mergedMsgs,
    offer,
    threadBuyerId,
    sellerUserId,
    meId,
  );
  const peerExit = peerPartyExitFromDto(dto);
  const premature =
    peerExit != null && peerExit.userId.trim() !== meId.trim();

  useMarketStore.setState((x) => {
    const nextThreads = { ...x.threads };
    if (existing && existing.id !== dto.id) delete nextThreads[existing.id];
    nextThreads[dto.id] = {
      ...bootstrap,
      id: dto.id,
      chatActionsLocked: false,
      buyerUserId: dto.buyerUserId,
      sellerUserId: dto.sellerUserId,
      ...(dto.buyerDisplayName?.trim()
        ? { buyerDisplayName: dto.buyerDisplayName.trim() }
        : {}),
      ...(dto.buyerAvatarUrl?.trim()
        ? { buyerAvatarUrl: dto.buyerAvatarUrl.trim() }
        : {}),
      purchaseMode: dto.purchaseMode,
      ...(peerExit
        ? {
            peerPartyExit: peerExit,
            partyExitedUserId: peerExit.userId,
            partyExitedReason: peerExit.reason,
            partyExitedAtUtc: peerExit.atUtc,
            prematureExitUnderInvestigation: premature,
          }
        : {}),
      messages: qaSynced,
      contracts,
      routeSheets: routeSheets.length > 0 ? routeSheets : bootstrap.routeSheets ?? [],
    };
    return { ...x, threads: nextThreads };
  });

  const subsRs = await fetchThreadRouteTramoSubscriptions(threadId).catch(
    () => null,
  );
  if (subsRs && Array.isArray(subsRs) && subsRs.length > 0) {
    useMarketStore
      .getState()
      .applyThreadRouteTramoSubscriptions(
        threadId,
        subsRs,
        meId,
      );
  }

  return true;
}
