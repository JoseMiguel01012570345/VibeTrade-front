import type { Offer } from "@app/store/marketStoreTypes";

export function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "offer-other-1",
    storeId: "store-other",
    title: "Oferta ajena",
    price: "50 USD",
    description: "Oferta de otra tienda",
    tags: [],
    imageUrl: "",
    ...overrides,
  };
}
