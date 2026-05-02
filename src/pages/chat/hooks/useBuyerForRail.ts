import { useMemo } from "react";
import type { Thread } from "../../../app/store/marketStoreTypes";
import { resolveBuyerUserId } from "../../../utils/chat/chatParticipantLabels";

type Me = {
  id: string;
  name: string;
  trustScore: number;
  avatarUrl?: string;
};

export function useBuyerForRail(
  thread: Thread | undefined,
  me: Me,
  profileDisplayNames: Record<string, string>,
  profileAvatarUrls: Record<string, string>,
  profileTrustScores: Record<string, number>,
  /** Tramo confirmado en oferta aunque `chatCarriers` aún no esté hidratado. */
  viewerIsConfirmedCarrier = false,
) {
  return useMemo(() => {
    if (!thread) {
      return {
        id: me.id,
        name: me.name,
        trustScore: me.trustScore,
        avatarUrl: me.avatarUrl,
      };
    }
    if (thread.demoBuyer) return thread.demoBuyer;

    const viewerInChatCarriers =
      thread.chatCarriers?.some((c) => (c.id ?? "").trim() === me.id.trim()) ??
      false;
    const carrierViewerContext =
      viewerIsConfirmedCarrier || viewerInChatCarriers;

    let buyerId = resolveBuyerUserId(thread, me.id);
    if (carrierViewerContext && buyerId === me.id.trim()) {
      const explicit = thread.buyerUserId?.trim();
      buyerId =
        explicit && explicit !== me.id.trim() ? explicit : undefined;
    }

    if (buyerId && buyerId === me.id) {
      return {
        id: me.id,
        name: me.name,
        trustScore: me.trustScore,
        avatarUrl: me.avatarUrl,
      };
    }
    if (buyerId) {
      const name =
        thread.buyerDisplayName?.trim() ||
        profileDisplayNames[buyerId]?.trim() ||
        "Comprador";
      const avatarUrl =
        thread.buyerAvatarUrl?.trim() ||
        profileAvatarUrls[buyerId]?.trim() ||
        undefined;
      return {
        id: buyerId,
        name,
        trustScore: profileTrustScores[buyerId] ?? 0,
        avatarUrl,
      };
    }
    const sellerUid = thread.sellerUserId ?? thread.store.ownerUserId;
    const viewerIsSeller = !!sellerUid && me.id === sellerUid;
    if (!viewerIsSeller) {
      if (carrierViewerContext) {
        const buid = thread.buyerUserId?.trim();
        if (buid && buid !== me.id.trim()) {
          const name =
            thread.buyerDisplayName?.trim() ||
            profileDisplayNames[buid]?.trim() ||
            "Comprador";
          const avatarUrl =
            thread.buyerAvatarUrl?.trim() ||
            profileAvatarUrls[buid]?.trim() ||
            undefined;
          return {
            id: buid,
            name,
            trustScore: profileTrustScores[buid] ?? 0,
            avatarUrl,
          };
        }
        return {
          id: `vt-thread-buyer:${thread.id}`,
          name: thread.buyerDisplayName?.trim() || "Comprador",
          trustScore: 0,
          avatarUrl: thread.buyerAvatarUrl?.trim() || undefined,
        };
      }
      return {
        id: me.id,
        name: me.name,
        trustScore: me.trustScore,
        avatarUrl: me.avatarUrl,
      };
    }
    const buid = thread.buyerUserId;
    return {
      id: buid ?? "unknown",
      name:
        thread.buyerDisplayName?.trim() ||
        (buid ? profileDisplayNames[buid]?.trim() : undefined) ||
        "Comprador",
      trustScore: buid ? (profileTrustScores[buid] ?? 0) : 0,
      avatarUrl:
        thread.buyerAvatarUrl?.trim() ||
        (buid ? profileAvatarUrls[buid]?.trim() : undefined) ||
        undefined,
    };
  }, [
    thread,
    me.id,
    me.name,
    me.trustScore,
    me.avatarUrl,
    profileDisplayNames,
    profileAvatarUrls,
    profileTrustScores,
    viewerIsConfirmedCarrier,
  ]);
}
