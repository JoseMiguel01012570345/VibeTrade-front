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
  fetchThreadTradeAgreements,
} from "./chatApi";
import { getSessionToken } from "../http/sessionToken";
import { peerPartyExitFromDto } from "./threadPeerPartyExit";

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

  const s = useMarketStore.getState();
  const offer = resolveOffer(s.offers, dto.offerId);
  const store = s.stores[dto.storeId];
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

  return true;
}
