export type HomeFeedSegment =
  | { type: "offers"; offerIds: string[] }
  | { type: "stores"; storeIds: string[] };
