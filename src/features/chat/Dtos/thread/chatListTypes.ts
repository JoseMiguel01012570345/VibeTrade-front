import type { Thread } from "@features/market/logic/store/useMarketStore";

export type ChatListRow = {
  th: Thread;
  offerTitle: string;
  preview: string;
  at: number;
  listTitle: string;
};
