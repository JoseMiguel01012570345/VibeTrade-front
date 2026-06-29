import { useCallback } from "react";
import { useAppStore } from "@features/auth/model/useAppStore";
import { useMarketStore } from "@features/market/model/store/useMarketStore";
import {
  mergePersistedChatMessages,
  mapChatMessageDtoToMessage,
} from "@features/chat/model/chatMerge";
import {
  fetchChatMessages,
  fetchThreadRouteSheets,
  fetchThreadRouteTramoSubscriptions,
} from "@features/chat/api/chatApi";
import type { RouteTramoSubscriptionItemApi } from "@features/chat/api/chatApi";
import { mergeChatSenderLabelsIntoProfileStore } from "@features/chat/model/chatSenderLabels";
import { mergedRouteOfferPublicAfterChatThreadHydration } from "@features/market/api/routeOfferPublicFromEmergentCard";
import { applyViewerRouteTramoSubscriptions } from "@features/chat/model/routeOfferSubscriptionMerge";
import {
  routeSheetEditAcksRecordFromSheets,
  type RouteSheet,
} from "@features/chat/model/routeSheetTypes";

type Params = {
  threadId: string | undefined;
  applyThreadRouteTramoSubscriptions: (
    threadId: string,
    subs: RouteTramoSubscriptionItemApi[],
    viewerId: string,
  ) => void;
  setRouteSheetsLoading: (v: boolean) => void;
};

export function useChatRouteRefresh({
  threadId,
  applyThreadRouteTramoSubscriptions,
  setRouteSheetsLoading,
}: Params) {
  const refreshChatRouteData = useCallback(async () => {
    const tid = threadId?.trim();
    if (!tid?.startsWith("cth_")) return;
    const uid = useAppStore.getState().me.id;
    setRouteSheetsLoading(true);
    try {
      const [sheets, subs, serverMsgs] = await Promise.all([
        fetchThreadRouteSheets(tid).catch(() => null),
        fetchThreadRouteTramoSubscriptions(tid).catch(() => null),
        fetchChatMessages(tid).catch(() => null),
      ]);
      if (serverMsgs !== null) {
        mergeChatSenderLabelsIntoProfileStore(serverMsgs);
        const mapped = serverMsgs.map((d) => mapChatMessageDtoToMessage(d, uid));
        useMarketStore.setState((s) => {
          const t = s.threads[tid];
          if (!t) return s;
          const validIds = new Set((t.contracts ?? []).map((c) => c.id));
          const merged = mergePersistedChatMessages(mapped, t.messages, {
            validTradeAgreementIds: validIds,
          });
          return {
            ...s,
            threads: {
              ...s.threads,
              [tid]: { ...t, messages: merged },
            },
          };
        });
      }
      if (sheets) {
        const sh = sheets as RouteSheet[];
        const acks = routeSheetEditAcksRecordFromSheets(sh);
        useMarketStore.setState((s) => {
          const t = s.threads[tid];
          if (!t) return s;
          const nextT = {
            ...t,
            routeSheets: sh,
            routeSheetEditAcks: { ...(t.routeSheetEditAcks ?? {}), ...acks },
          };
          const roNext = mergedRouteOfferPublicAfterChatThreadHydration(
            s.routeOfferPublic,
            nextT,
            s.offers[nextT.offerId],
          );
          let next: typeof s = {
            ...s,
            threads: { ...s.threads, [tid]: nextT },
            ...(roNext ? { routeOfferPublic: roNext } : {}),
          };
          if (subs && Array.isArray(subs)) {
            const mergedSubs = applyViewerRouteTramoSubscriptions(
              next,
              tid,
              subs,
              uid,
            );
            if (mergedSubs) next = mergedSubs;
          }
          return next;
        });
      } else if (subs && Array.isArray(subs)) {
        applyThreadRouteTramoSubscriptions(tid, subs, uid);
      }
    } finally {
      setRouteSheetsLoading(false);
    }
  }, [threadId, applyThreadRouteTramoSubscriptions, setRouteSheetsLoading]);

  const syncThreadRouteSheetsFromSubscribersPanel = useCallback(
    (sheets: RouteSheet[]) => {
      const tid = threadId?.trim();
      if (!tid?.startsWith("cth_")) return;
      const acks = routeSheetEditAcksRecordFromSheets(sheets);
      useMarketStore.setState((s) => {
        const t = s.threads[tid];
        if (!t) return s;
        const nextT = {
          ...t,
          routeSheets: sheets,
          routeSheetEditAcks: { ...(t.routeSheetEditAcks ?? {}), ...acks },
        };
        const roNext = mergedRouteOfferPublicAfterChatThreadHydration(
          s.routeOfferPublic,
          nextT,
          s.offers[nextT.offerId],
        );
        return {
          ...s,
          threads: { ...s.threads, [tid]: nextT },
          ...(roNext ? { routeOfferPublic: roNext } : {}),
        };
      });
    },
    [threadId],
  );

  return { refreshChatRouteData, syncThreadRouteSheetsFromSubscribersPanel };
}
