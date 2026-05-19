import { describe, expect, it } from "vitest";
import { syncOwnQaIntoMessages } from "@app/store/marketStoreHelpers";
import { makeOffer } from "@test/Resources/Chat/thread-factories";

describe("syncOwnQaIntoMessages", () => {
  it("seeds buyer and seller public comments for both viewers", () => {
    const offer = makeOffer({
      qa: [
        {
          id: "qa-buyer",
          question: "¿Tienen stock?",
          text: "¿Tienen stock?",
          createdAt: 1000,
          author: { id: "buyer-1", name: "Comprador", trustScore: 50 },
          askedBy: { id: "buyer-1", name: "Comprador", trustScore: 50 },
        },
        {
          id: "qa-seller",
          question: "Sí, hay stock",
          text: "Sí, hay stock",
          createdAt: 2000,
          author: { id: "seller-1", name: "Vendedor", trustScore: 80 },
          askedBy: { id: "seller-1", name: "Vendedor", trustScore: 80 },
        },
      ],
    });

    const asBuyer = syncOwnQaIntoMessages(
      [],
      offer,
      "buyer-1",
      "seller-1",
      "buyer-1",
    );
    expect(asBuyer).toHaveLength(2);
    const buyerMsg = asBuyer.find((m) => m.type === "text" && m.offerQaId === "qa-buyer");
    const sellerMsg = asBuyer.find((m) => m.type === "text" && m.offerQaId === "qa-seller");
    expect(buyerMsg?.from).toBe("me");
    expect(sellerMsg?.from).toBe("other");

    const asSeller = syncOwnQaIntoMessages(
      [],
      offer,
      "buyer-1",
      "seller-1",
      "seller-1",
    );
    const sellerViewBuyer = asSeller.find(
      (m) => m.type === "text" && m.offerQaId === "qa-buyer",
    );
    const sellerViewSelf = asSeller.find(
      (m) => m.type === "text" && m.offerQaId === "qa-seller",
    );
    expect(sellerViewBuyer?.from).toBe("other");
    expect(sellerViewSelf?.from).toBe("me");
  });

  it("does not duplicate when offerQaId already present", () => {
    const offer = makeOffer({
      qa: [
        {
          id: "qa-1",
          question: "Hola",
          text: "Hola",
          createdAt: 1,
          author: { id: "buyer-1", name: "C", trustScore: 1 },
          askedBy: { id: "buyer-1", name: "C", trustScore: 1 },
        },
      ],
    });
    const seeded = syncOwnQaIntoMessages(
      [
        {
          id: "m0",
          from: "me",
          type: "text",
          text: "Hola",
          at: 1,
          offerQaId: "qa-1",
        },
      ],
      offer,
      "buyer-1",
      "seller-1",
      "buyer-1",
    );
    expect(seeded.filter((m) => m.offerQaId === "qa-1")).toHaveLength(1);
  });
});
