import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@features/auth/logic/useAppStore";
import {
  mergePersistedChatMessages,
  mapChatMessageDtoToMessage,
} from "@features/chat/logic/thread/chatMerge";
import { mapTradeAgreementApiToTradeAgreement } from "@features/chat/logic/agreement/tradeAgreementApiMapper";
import {
  mergeBuyerLabelFromThreadDto,
  mergeChatSenderLabelsIntoProfileStore,
} from "@features/chat/logic/participants/chatSenderLabels";
import {
  minimalOfferStoreFromChatThreadDto,
  VT_SOCIAL_PLACEHOLDER_OFFER_ID,
} from "@features/chat/logic/thread/chatThreadDtoFallbacks";
import {
  buildPurchaseThreadSystemOnly,
} from "@features/market/logic/store/marketStoreHelpers";
import { mergedRouteOfferPublicAfterChatThreadHydration } from "@features/market/logic/routeOfferPublicFromEmergentCard";
import { applyViewerRouteTramoSubscriptions } from "@features/chat/logic/route-sheet/routeOfferSubscriptionMerge";
import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import { routeSheetEditAcksRecordFromSheets } from "@features/chat/logic/route-sheet/routeSheetTypes";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { partyExpelledFieldsFromDto } from "@features/chat/logic/party-exit/threadPartyExpelled";
import { applyPublicOfferCardToStore } from "@features/market/logic/publicOfferCardStoreSync";
import { queryKeys } from "@shared/lib/queryKeys";
import { fetchPublicOfferCard } from "@features/market/api/marketPersistence";
import {
  useChatThreadAgreementsQuery,
  useChatThreadMessagesQuery,
  useChatThreadQuery,
  useChatThreadRouteSheetsQuery,
  useChatThreadRouteTramoSubsQuery,
} from "./useChatThreadQueries";

type Params = {
  threadId: string | undefined;
  searchParams: URLSearchParams;
  setPersistThreadError: (v: boolean) => void;
  setContractsLoading: (v: boolean) => void;
  setRouteSheetsLoading: (v: boolean) => void;
};

export function useHydratePersistedChatThread({
  threadId,
  searchParams,
  setPersistThreadError,
  setContractsLoading,
  setRouteSheetsLoading,
}: Params) {
  const queryClient = useQueryClient();
  const syncedKeyRef = useRef<string | null>(null);

  const tid = threadId?.trim() ?? "";
  const preselBlock =
    searchParams.get("presel") === "1" && !!searchParams.get("sheet")?.trim();
  const enabled = tid.startsWith("cth_") && !preselBlock;

  const threadQ = useChatThreadQuery(tid, enabled);
  const threadReady = enabled && threadQ.isSuccess && !!threadQ.data;
  const messagesQ = useChatThreadMessagesQuery(tid, threadReady);
  const agreementsQ = useChatThreadAgreementsQuery(tid, threadReady);
  const sheetsQ = useChatThreadRouteSheetsQuery(tid, threadReady);
  const subsQ = useChatThreadRouteTramoSubsQuery(tid, threadReady);

  useEffect(() => {
    if (!enabled) return;
    setPersistThreadError(false);
  }, [enabled, tid, setPersistThreadError]);

  useEffect(() => {
    if (!enabled) return;
    const loading =
      threadQ.isLoading ||
      (threadReady &&
        (messagesQ.isLoading ||
          agreementsQ.isLoading ||
          sheetsQ.isLoading ||
          subsQ.isLoading));
    setContractsLoading(loading);
    setRouteSheetsLoading(loading);
  }, [
    enabled,
    threadReady,
    threadQ.isLoading,
    messagesQ.isLoading,
    agreementsQ.isLoading,
    sheetsQ.isLoading,
    subsQ.isLoading,
    setContractsLoading,
    setRouteSheetsLoading,
  ]);

  useEffect(() => {
    if (threadQ.isError) setPersistThreadError(true);
  }, [threadQ.isError, setPersistThreadError]);

  useEffect(() => {
    if (!threadReady || !threadQ.data || !messagesQ.data) return;
    if (agreementsQ.isLoading || sheetsQ.isLoading || subsQ.isLoading) return;

    const syncKey = [
      tid,
      threadQ.dataUpdatedAt,
      messagesQ.dataUpdatedAt,
      agreementsQ.dataUpdatedAt,
      sheetsQ.dataUpdatedAt,
      subsQ.dataUpdatedAt,
    ].join(":");
    if (syncedKeyRef.current === syncKey) return;

    let cancelled = false;
    void (async () => {
      try {
        const dto = threadQ.data!;
        mergeBuyerLabelFromThreadDto(dto);
        let offer = useMarketStore.getState().offers[dto.offerId];
        let store = useMarketStore.getState().stores[dto.storeId];
        if (
          (!offer || !store) &&
          dto.offerId?.trim() !== VT_SOCIAL_PLACEHOLDER_OFFER_ID &&
          dto.isSocialGroup !== true
        ) {
          const card = await queryClient.fetchQuery({
            queryKey: queryKeys.publicOfferCard(dto.offerId),
            queryFn: () => fetchPublicOfferCard(dto.offerId),
            staleTime: 30_000,
          }).catch(() => null);
          if (card?.offer?.id) {
            applyPublicOfferCardToStore(card);
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

        const existingTh = useMarketStore.getState().threads[tid];
        const msgs = messagesQ.data!;
        const agResult = agreementsQ.isSuccess
          ? { ok: true as const, agreements: agreementsQ.data! }
          : { ok: false as const };
        const routeSheetsRs = sheetsQ.isSuccess ? sheetsQ.data! : null;
        const subsRs = subsQ.isSuccess ? subsQ.data! : null;

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
        const localBasis =
          prevMsgs && prevMsgs.length > 0
            ? prevMsgs
            : dto.purchaseMode
              ? buildPurchaseThreadSystemOnly(offer)
              : [];
        const merged = mergePersistedChatMessages(
          mapped,
          localBasis,
          validAgreementIds
            ? { validTradeAgreementIds: validAgreementIds }
            : undefined,
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
            ...partyExpelledFieldsFromDto(dto),
            messages: merged,
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
        syncedKeyRef.current = syncKey;
      } catch {
        if (!cancelled) setPersistThreadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    tid,
    threadReady,
    threadQ.data,
    threadQ.dataUpdatedAt,
    messagesQ.data,
    messagesQ.dataUpdatedAt,
    agreementsQ.data,
    agreementsQ.dataUpdatedAt,
    agreementsQ.isSuccess,
    agreementsQ.isLoading,
    sheetsQ.data,
    sheetsQ.dataUpdatedAt,
    sheetsQ.isSuccess,
    sheetsQ.isLoading,
    subsQ.data,
    subsQ.dataUpdatedAt,
    subsQ.isSuccess,
    subsQ.isLoading,
    queryClient,
    setPersistThreadError,
  ]);
}
