import { describe, expect, it } from "vitest";
import { buildChatParticipants } from "@features/chat/lib/chatParticipants";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";

describe("buildChatParticipants", () => {
  it("includes buyer, seller and carrier with profile links", () => {
    const store = makeStoreBadge({
      id: "store-1",
      ownerUserId: "seller-user",
      name: "Tienda Beta",
      trustScore: 88,
    });
    const parts = buildChatParticipants(
      { id: "buyer-1", name: "Ana", trustScore: 55 },
      store,
      [
        {
          id: "carrier-1",
          name: "Transporte X",
          phone: "+5491199999999",
          trustScore: 70,
          vehicleLabel: "Camión",
          tramoLabel: "Tramo 1",
        },
      ],
    );
    expect(parts).toHaveLength(3);
    expect(parts[0]?.href).toBe("/profile/buyer-1");
    expect(parts[0]?.roleLabel).toBe("Comprador");
    expect(parts[1]?.href).toBe("/store/store-1/vitrina");
    expect(parts[2]?.phone).toBe("+5491199999999");
    expect(parts[2]?.href).toBe("/profile/carrier-1");
    expect(parts[2]?.trustScore).toBe(70);
  });
});
