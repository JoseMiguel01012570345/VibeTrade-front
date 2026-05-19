import { beforeEach, describe, expect, it } from "vitest";
import { useMarketStore } from "@app/store/useMarketStore";
import { seedAppStore } from "@test/Resources/Core/store-builders";
import {
  makeThread,
  makeTradeAgreement,
  seedChatThread,
} from "@test/Resources/Chat/thread-factories";
import { SELLER_TRUST_PENALTY_ON_EDIT } from "@features/chat/components/modals/TrustRiskEditConfirmModal";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";

describe("store trust penalty on agreement reject", () => {
  beforeEach(() => {
    sessionStorage.clear();
    seedAppStore({
      isSessionActive: true,
      me: {
        id: "buyer-1",
        name: "Comprador",
        email: "",
        phone: "",
        trustScore: 50,
      },
    });
    const store = makeStoreBadge({ id: "store-1", trustScore: 90 });
    useMarketStore.setState((s) => ({
      stores: { ...s.stores, [store.id]: store },
    }));
    seedChatThread(
      makeThread({
        id: "vt-thread-trust-local",
        store,
        storeId: store.id,
        contracts: [
          makeTradeAgreement({
            id: "agr_1",
            status: "pending_buyer",
            hadBuyerAcceptance: true,
          }),
        ],
      }),
    );
  });

  it("applyStoreTrustPenalty reduces store score locally", () => {
    useMarketStore
      .getState()
      .applyStoreTrustPenalty("store-1", SELLER_TRUST_PENALTY_ON_EDIT, "demo", {
        forceLocal: true,
      });
    expect(useMarketStore.getState().stores["store-1"]?.trustScore).toBe(
      90 - SELLER_TRUST_PENALTY_ON_EDIT,
    );
  });

  it("respondTradeAgreement rejects and adds system notice", async () => {
    const ok = await useMarketStore
      .getState()
      .respondTradeAgreement("vt-thread-trust-local", "agr_1", "reject");
    expect(ok).toBe(true);
    const th = useMarketStore.getState().threads["vt-thread-trust-local"];
    expect(th?.contracts?.[0]?.status).toBe("rejected");
    expect(
      th?.messages.some(
        (m) => m.type === "text" && m.from === "system" && m.text.includes("rechazado"),
      ),
    ).toBe(true);
  });
});
