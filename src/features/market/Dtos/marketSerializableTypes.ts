import type { MarketState } from "../model/store/marketStoreTypes";

/** Forma del mercado en bootstrap / GET workspace (snapshot completo). */
export type MarketSerializableSlice = Pick<
  MarketState,
  | "stores"
  | "offers"
  | "offerIds"
  | "storeCatalogs"
  | "threads"
  | "routeOfferPublic"
>;
