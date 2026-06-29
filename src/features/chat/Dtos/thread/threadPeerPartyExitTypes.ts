export type PeerPartyExit = {
  userId: string;
  reason: string;
  atUtc: string;
  leaverRole?: "buyer" | "seller";
};
