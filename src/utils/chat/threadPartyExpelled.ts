import type { ChatThreadDto } from "./chatApi";
import type { Thread } from "@app/store/marketStoreTypes";
import { resolveSellerUserId } from "./chatParticipantLabels";

type ThreadPartyExpelledFields = Pick<
  Thread,
  "buyerExpelledAtUtc" | "sellerExpelledAtUtc"
>;

type PartyExpelledDto = Pick<
  ChatThreadDto,
  | "buyerUserId"
  | "sellerUserId"
  | "partyExitedUserId"
  | "partyExitedAtUtc"
  | "buyerExpelledAtUtc"
  | "sellerExpelledAtUtc"
>;

export function partyExpelledFieldsFromDto(
  d: PartyExpelledDto | null | undefined,
): ThreadPartyExpelledFields {
  if (!d) return {};
  const out: ThreadPartyExpelledFields = {};
  if (d.buyerExpelledAtUtc) {
    out.buyerExpelledAtUtc = String(d.buyerExpelledAtUtc);
  }
  if (d.sellerExpelledAtUtc) {
    out.sellerExpelledAtUtc = String(d.sellerExpelledAtUtc);
  }
  if (out.buyerExpelledAtUtc || out.sellerExpelledAtUtc) return out;

  const uid = d.partyExitedUserId?.trim();
  if (!uid) return out;
  const at =
    d.partyExitedAtUtc != null ? String(d.partyExitedAtUtc) : undefined;
  const buyer = (d.buyerUserId ?? "").trim();
  const seller = (d.sellerUserId ?? "").trim();
  if (buyer && uid === buyer && at) out.buyerExpelledAtUtc = at;
  if (seller && uid === seller && at) out.sellerExpelledAtUtc = at;
  return out;
}

export function isBuyerExpelledFromThread(
  th: Pick<
    Thread,
    | "buyerExpelledAtUtc"
    | "buyerUserId"
    | "partyExitedUserId"
    | "peerPartyExit"
  >,
): boolean {
  if (th.buyerExpelledAtUtc) return true;
  const buyer = (th.buyerUserId ?? "").trim();
  if (!buyer) return false;
  if (th.peerPartyExit?.leaverRole === "buyer") return true;
  const uid = th.partyExitedUserId?.trim();
  return !!uid && uid === buyer;
}

export function isSellerExpelledFromThread(
  th: Pick<
    Thread,
    | "sellerExpelledAtUtc"
    | "sellerUserId"
    | "store"
    | "partyExitedUserId"
    | "peerPartyExit"
  >,
): boolean {
  if (th.sellerExpelledAtUtc) return true;
  const seller = (resolveSellerUserId(th as Thread) ?? "").trim();
  if (!seller) return false;
  if (th.peerPartyExit?.leaverRole === "seller") return true;
  const uid = th.partyExitedUserId?.trim();
  return !!uid && uid === seller;
}

/** Marca salida de comprador o vendedor en el estado local del hilo. */
export function markPartyExpelledOnThread(
  th: Thread,
  leaverUserId: string,
  atUtc: string,
  leaverRole?: "buyer" | "seller",
): ThreadPartyExpelledFields {
  const uid = leaverUserId.trim();
  const at = atUtc.trim() || new Date().toISOString();
  const buyer = (th.buyerUserId ?? "").trim();
  const seller = (resolveSellerUserId(th) ?? "").trim();
  const next: ThreadPartyExpelledFields = {
    buyerExpelledAtUtc: th.buyerExpelledAtUtc,
    sellerExpelledAtUtc: th.sellerExpelledAtUtc,
  };
  if (leaverRole === "buyer" || (uid && buyer && uid === buyer)) {
    next.buyerExpelledAtUtc = at;
  }
  if (leaverRole === "seller" || (uid && seller && uid === seller)) {
    next.sellerExpelledAtUtc = at;
  }
  return next;
}
