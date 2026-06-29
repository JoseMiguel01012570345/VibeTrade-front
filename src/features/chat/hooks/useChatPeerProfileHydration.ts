import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@features/auth/logic/useAppStore";
import type { Thread } from "@features/market/logic/store/marketStoreTypes";
import {
  fetchPublicProfile,
  mergePublicProfileIntoAppStore,
  wasPublicProfileHydrated,
} from "@features/auth/logic/publicProfile";
import { publicProfileQueryKey } from "@features/profile/hooks/usePublicProfile";
import { resolveBuyerUserId } from "@features/chat/logic/participants/chatParticipantLabels";

export function useChatPeerProfileHydration(
  thread: Thread | undefined,
  meId: string,
  isSocialThread: boolean,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!thread) return;
    const trimmedMe = meId.trim();
    const state = useAppStore.getState();
    const scores = state.profileTrustScores;
    const avatars = state.profileAvatarUrls;

    const candidateIds = new Set<string>();
    const bid = resolveBuyerUserId(thread, meId)?.trim();
    const sellerUid = (thread.sellerUserId ?? thread.store.ownerUserId)?.trim();
    const oid = thread.store.ownerUserId?.trim();
    if (bid && bid.length >= 2) candidateIds.add(bid);
    if (sellerUid && sellerUid.length >= 2) candidateIds.add(sellerUid);
    if (oid && oid.length >= 2) candidateIds.add(oid);

    if (isSocialThread) {
      for (const m of thread.messages ?? []) {
        if (m.from !== "other") continue;
        const uid =
          "chatSenderUserId" in m && m.chatSenderUserId?.trim()
            ? m.chatSenderUserId.trim()
            : undefined;
        if (uid && uid.length >= 2) candidateIds.add(uid);
      }
    }

    const unique = [...candidateIds].filter((id) => {
      if (!id || id === trimmedMe || id === "guest") return false;
      if (wasPublicProfileHydrated(id)) return false;
      if (scores[id] === undefined) return true;
      if (!avatars[id]?.trim()) return true;
      return false;
    });

    if (unique.length === 0) return;
    let cancelled = false;
    void Promise.all(
      unique.map((id) =>
        queryClient
          .fetchQuery({
            queryKey: publicProfileQueryKey(id),
            queryFn: () => fetchPublicProfile(id),
            staleTime: 30_000,
          })
          .then((p) => {
            if (cancelled || !p) return;
            mergePublicProfileIntoAppStore(p);
          }),
      ),
    );
    return () => {
      cancelled = true;
    };
  }, [thread, meId, isSocialThread, queryClient]);
}
