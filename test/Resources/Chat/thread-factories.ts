import type {
  Message,
  Offer,
  Thread,
  TradeAgreement,
} from "@app/store/marketStoreTypes";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";

export function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "offer-1",
    storeId: "store-1",
    title: "Producto demo",
    price: "$100",
    tags: [],
    imageUrl: "https://cdn.example/photo1.jpg",
    imageUrls: ["https://cdn.example/photo1.jpg"],
    ...overrides,
  };
}

export function makeThread(overrides: Partial<Thread> = {}): Thread {
  const store = overrides.store ?? makeStoreBadge();
  return {
    id: "cth_test_001",
    offerId: "offer-1",
    storeId: store.id,
    store,
    buyerUserId: "buyer-1",
    sellerUserId: store.ownerUserId ?? "seller-1",
    purchaseMode: true,
    messages: [],
    contracts: [],
    routeSheets: [],
    ...overrides,
  };
}

export function makeTextMessage(
  overrides: Partial<Extract<Message, { type: "text" }>> & {
    id?: string;
    from?: "me" | "other" | "system";
    text?: string;
    at?: number;
  } = {},
): Message {
  return {
    id: overrides.id ?? "cmg_text_1",
    from: overrides.from ?? "me",
    type: "text",
    text: overrides.text ?? "Hola",
    at: overrides.at ?? Date.now(),
    ...overrides,
  } as Message;
}

export function makeAgreementMessage(
  agreementId: string,
  title: string,
  overrides: Partial<Extract<Message, { type: "agreement" }>> = {},
): Message {
  return {
    id: overrides.id ?? "cmg_agr_1",
    from: overrides.from ?? "other",
    type: "agreement",
    agreementId,
    title,
    at: overrides.at ?? Date.now(),
    ...overrides,
  };
}

export function makeTradeAgreement(
  overrides: Partial<TradeAgreement> = {},
): TradeAgreement {
  return {
    id: "agr_1",
    threadId: "cth_1",
    title: "Acuerdo demo",
    issuedAt: Date.now() - 60_000,
    issuedByStoreId: "store-1",
    issuerLabel: "Tienda Alpha",
    status: "pending_buyer",
    includeMerchandise: true,
    includeService: false,
    merchandise: [],
    services: [],
    ...overrides,
  };
}

import { useMarketStore } from "@app/store/useMarketStore";

export function seedChatThread(thread: Thread) {
  useMarketStore.setState((s) => ({
    threads: { ...s.threads, [thread.id]: thread },
  }));
}
