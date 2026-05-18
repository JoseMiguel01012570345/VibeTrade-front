import { useEffect } from "react";
import { useAppStore } from "@app/store/useAppStore";
import {
  mergePersistedChatMessages,
  mapChatMessageDtoToMessage,
} from "@/utils/chat/chatMerge";
import {
  fetchChatMessages,
  fetchChatThread,
  fetchThreadRouteSheets,
  fetchThreadRouteTramoSubscriptions,
  fetchThreadTradeAgreements,
} from "@/utils/chat/chatApi";
import { mapTradeAgreementApiToTradeAgreement } from "@/utils/chat/tradeAgreementApiMapper";
import {
  mergeBuyerLabelFromThreadDto,
  mergeChatSenderLabelsIntoProfileStore,
} from "@/utils/chat/chatSenderLabels";
import {
  minimalOfferStoreFromChatThreadDto,
  VT_SOCIAL_PLACEHOLDER_OFFER_ID,
} from "@/utils/chat/chatThreadDtoFallbacks";
import { fetchPublicOfferCard } from "@/utils/market/marketPersistence";
import {
  buildPurchaseThreadMessages,
  buildPurchaseThreadSystemOnly,
  syncOwnQaIntoMessages,
} from "@app/store/marketStoreHelpers";
import { mergedRouteOfferPublicAfterChatThreadHydration } from "@/utils/market/routeOfferPublicFromEmergentCard";
import { applyViewerRouteTramoSubscriptions } from "@features/market/model/routeOfferSubscriptionMerge";
import {
  routeSheetEditAcksRecordFromSheets,
  type RouteSheet,
} from "@features/market/model/routeSheetTypes";
import { useMarketStore } from "@app/store/useMarketStore";

type Params = {
  threadId: string | undefined;
  searchParams: URLSearchParams;
  refreshOfferQaFromServer: (offerId: string) => Promise<void>;
  setPersistThreadError: (v: boolean) => void;
  setContractsLoading: (v: boolean) => void;
  setRouteSheetsLoading: (v: boolean) => void;
};

export function useHydratePersistedChatThread({
  threadId,
  searchParams,
  refreshOfferQaFromServer,
  setPersistThreadError,
  setContractsLoading,
  setRouteSheetsLoading,
}: Params) {
  useEffect(() => {
    const tid = threadId?.trim() ?? "";
    if (!tid.startsWith("cth_")) return;
    if (searchParams.get("presel") === "1" && searchParams.get("sheet")?.trim())
      return;
    const existingTh = useMarketStore.getState().threads[tid];
    setPersistThreadError(false);
    let cancelled = false;
    void (async () => {
      try {
        const dto = await fetchChatThread(tid);
        mergeBuyerLabelFromThreadDto(dto);
        let offer = useMarketStore.getState().offers[dto.offerId];
        let store = useMarketStore.getState().stores[dto.storeId];
        if (
          (!offer || !store) &&
          dto.offerId?.trim() !== VT_SOCIAL_PLACEHOLDER_OFFER_ID &&
          dto.isSocialGroup !== true
        ) {
          const card = await fetchPublicOfferCard(dto.offerId).catch(
            () => null,
          );
          if (card?.offer?.id) {
            const storeKey = card.store.id?.trim() || card.offer.storeId;
            useMarketStore.setState((s) => {
              const nextStores = { ...s.stores };
              if (storeKey) {
                nextStores[storeKey] = {
                  ...s.stores[storeKey],
                  ...card.store,
                  id: storeKey,
                };
              }
              return {
                ...s,
                offers: { ...s.offers, [card.offer.id]: card.offer },
                stores: nextStores,
              };
            });
            offer = useMarketStore.getState().offers[dto.offerId];
            store = useMarketStore.getState().stores[dto.storeId];
          }
        }
        if (!offer || !store) {
          const { offer: fo, store: st } =
            minimalOfferStoreFromChatThreadDto(dto);
          useMarketStore.setState((s) => ({
            ...s,
            offers: { ...s.offers, [fo.id]: fo },
            stores: { ...s.stores, [st.id]: st },
          }));
          offer = useMarketStore.getState().offers[dto.offerId];
          store = useMarketStore.getState().stores[dto.storeId];
        }
        if (!offer || !store) {
          if (!cancelled) setPersistThreadError(true);
          return;
        }
        if (!cancelled) {
          setContractsLoading(true);
          setRouteSheetsLoading(true);
        }
        const [msgs, agResult, routeSheetsRs, subsRs] = await Promise.all([
          fetchChatMessages(tid),
          fetchThreadTradeAgreements(tid)
            .then((a) => ({ ok: true as const, agreements: a }))
            .catch(() => ({ ok: false as const })),
          fetchThreadRouteSheets(tid).catch(() => null),
          fetchThreadRouteTramoSubscriptions(tid).catch(() => null),
        ]);
        const contracts = agResult.ok
          ? agResult.agreements.map(mapTradeAgreementApiToTradeAgreement)
          : (existingTh?.contracts ?? []);
        const validAgreementIds: Set<string> | undefined = agResult.ok
          ? new Set(agResult.agreements.map((a) => a.id))
          : existingTh?.contracts?.length
            ? new Set(existingTh.contracts.map((c) => c.id))
            : undefined;
        mergeChatSenderLabelsIntoProfileStore(msgs);
        const meId = useAppStore.getState().me.id;
        const mapped = msgs.map((d) => mapChatMessageDtoToMessage(d, meId));
        const prevMsgs = existingTh?.messages;
        const sellerUserId = dto.sellerUserId ?? store.ownerUserId;
        const localBasis =
          prevMsgs && prevMsgs.length > 0
            ? prevMsgs
            : msgs.length > 0
              ? dto.purchaseMode
                ? buildPurchaseThreadSystemOnly(offer)
                : []
              : dto.purchaseMode
                ? buildPurchaseThreadMessages(
                    offer,
                    dto.buyerUserId,
                    sellerUserId,
                    meId,
                  )
                : [];
        const merged = mergePersistedChatMessages(
          mapped,
          localBasis,
          validAgreementIds
            ? { validTradeAgreementIds: validAgreementIds }
            : undefined,
        );
        const qaSynced = syncOwnQaIntoMessages(
          merged,
          offer,
          dto.buyerUserId,
          sellerUserId,
          meId,
        );
        if (cancelled) return;
        const sheetsForThread =
          routeSheetsRs !== null
            ? (routeSheetsRs as RouteSheet[])
            : (existingTh?.routeSheets ?? []);
        const acksFromSheets =
          routeSheetEditAcksRecordFromSheets(sheetsForThread);
        useMarketStore.setState((s) => {
          const nextThread = {
            ...(s.threads[tid] ?? {}),
            id: tid,
            chatActionsLocked: false,
            offerId: dto.offerId,
            storeId: dto.storeId,
            store,
            buyerUserId: dto.buyerUserId,
            sellerUserId: dto.sellerUserId,
            ...(dto.buyerDisplayName?.trim()
              ? { buyerDisplayName: dto.buyerDisplayName.trim() }
              : {}),
            ...(dto.buyerAvatarUrl?.trim()
              ? { buyerAvatarUrl: dto.buyerAvatarUrl.trim() }
              : {}),
            purchaseMode: dto.purchaseMode,
            ...(dto.isSocialGroup ||
            dto.offerId?.trim() === VT_SOCIAL_PLACEHOLDER_OFFER_ID
              ? { isSocialGroup: true as const }
              : {}),
            ...(dto.socialGroupTitle !== undefined
              ? {
                  socialGroupTitle: dto.socialGroupTitle?.trim()
                    ? dto.socialGroupTitle.trim()
                    : null,
                }
              : {}),
            messages: qaSynced,
            contracts,
            routeSheets: sheetsForThread,
            ...(Object.keys(acksFromSheets).length > 0
              ? {
                  routeSheetEditAcks: {
                    ...(s.threads[tid]?.routeSheetEditAcks ?? {}),
                    ...acksFromSheets,
                  },
                }
              : {}),
          };
          const roNext = mergedRouteOfferPublicAfterChatThreadHydration(
            s.routeOfferPublic,
            nextThread,
            offer,
          );
          let next: typeof s = {
            ...s,
            threads: { ...s.threads, [tid]: nextThread },
            ...(roNext ? { routeOfferPublic: roNext } : {}),
          };
          if (subsRs && Array.isArray(subsRs)) {
            const mergedSubs = applyViewerRouteTramoSubscriptions(
              next,
              tid,
              subsRs,
              meId,
            );
            if (mergedSubs) next = mergedSubs;
          }
          return next;
        });
        if (dto.purchaseMode && dto.offerId?.trim()) {
          void refreshOfferQaFromServer(dto.offerId.trim());
        }
      } catch {
        if (!cancelled) setPersistThreadError(true);
      } finally {
        if (!cancelled) {
          setContractsLoading(false);
          setRouteSheetsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    threadId,
    refreshOfferQaFromServer,
    searchParams,
    setPersistThreadError,
    setContractsLoading,
    setRouteSheetsLoading,
  ]);
}
