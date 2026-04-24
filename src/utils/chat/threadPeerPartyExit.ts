import type { Thread } from "../../app/store/marketStoreTypes";
import type { ChatThreadDto } from "./chatApi";

export type PeerPartyExit = {
  userId: string;
  reason: string;
  atUtc: string;
  leaverRole?: "buyer" | "seller";
};

export function peerPartyExitFromDto(
  d:
    | Pick<
        ChatThreadDto,
        "partyExitedUserId" | "partyExitedReason" | "partyExitedAtUtc"
      >
    | null
    | undefined,
): PeerPartyExit | undefined {
  if (!d?.partyExitedUserId?.trim()) return undefined;
  return {
    userId: d.partyExitedUserId.trim(),
    reason: (d.partyExitedReason ?? "").trim(),
    atUtc: d.partyExitedAtUtc ?? "",
  };
}

export function getThreadPeerPartyExit(th: Thread | undefined): PeerPartyExit | undefined {
  if (!th) return undefined;
  if (th.peerPartyExit?.userId) return th.peerPartyExit;
  const uid = th.partyExitedUserId?.trim();
  if (!uid) return undefined;
  return {
    userId: uid,
    reason: (th.partyExitedReason ?? "").trim(),
    atUtc:
      typeof th.partyExitedAtUtc === "string"
        ? th.partyExitedAtUtc
        : th.partyExitedAtUtc != null
          ? String(th.partyExitedAtUtc)
          : "",
  };
}
