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

/**
 * `partyExitedUserId` en el hilo (última salida “con acuerdo” registrada en servidor) identifica
 * a quien salió primero. Si no está vacío y no es el usuario que intenta salir ahora, la
 * contraparte ya se fue: no aplica la penalización de confianza a quien sale segundo.
 */
export function counterpartyAlreadyRecordedPartyExit(
  partyExitedUserId: string | null | undefined,
  leaverUserId: string,
): boolean {
  const p = (partyExitedUserId ?? "").trim();
  const me = (leaverUserId ?? "").trim();
  if (p.length < 2 || me.length < 2) return false;
  return p !== me;
}

export function counterpartyAlreadyRecordedPartyExitFromThread(
  th: Thread | undefined,
  leaverUserId: string,
): boolean {
  const peer = getThreadPeerPartyExit(th);
  return counterpartyAlreadyRecordedPartyExit(peer?.userId, leaverUserId);
}
