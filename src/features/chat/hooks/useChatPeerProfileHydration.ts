import { useEffect } from "react";
import { useAppStore } from "@features/auth/store/useAppStore";
import type { Thread } from "@features/market/model/store/marketStoreTypes";
import {
  fetchPublicProfile,
  mergePublicProfileIntoAppStore,
  wasPublicProfileHydrated,
} from "@features/auth/api/fetchPublicProfile";
import { resolveBuyerUserId } from "@features/chat/model/chatParticipantLabels";

export function useChatPeerProfileHydration(
  thread: Thread | undefined,
  meId: string,
  isSocialThread: boolean,
) {
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
        fetchPublicProfile(id).then((p) => {
          if (cancelled || !p) return;
          mergePublicProfileIntoAppStore(p);
        }),
      ),
    );
    return () => {
      cancelled = true;
    };
  }, [thread, meId, isSocialThread]);
}
