import { describe, expect, it, vi } from "vitest";
import { createOrGetChatThread } from "@/utils/chat/chatApi";

vi.mock("@/utils/chat/chatApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/chat/chatApi")>();
  return {
    ...actual,
    createOrGetChatThread: vi.fn(),
  };
});

describe("createOrGetChatThread forceNew flag", () => {
  it("passes purchaseIntent and forceNew to API", async () => {
    const mocked = vi.mocked(createOrGetChatThread);
    mocked.mockResolvedValueOnce({
      id: "cth_first",
      offerId: "offer-1",
      storeId: "store-1",
      buyerUserId: "buyer-1",
      sellerUserId: "seller-1",
      initiatorUserId: "buyer-1",
      purchaseMode: true,
      createdAtUtc: new Date().toISOString(),
      firstMessageSentAtUtc: null,
    });
    mocked.mockResolvedValueOnce({
      id: "cth_second",
      offerId: "offer-1",
      storeId: "store-1",
      buyerUserId: "buyer-1",
      sellerUserId: "seller-1",
      initiatorUserId: "buyer-1",
      purchaseMode: true,
      createdAtUtc: new Date().toISOString(),
      firstMessageSentAtUtc: null,
    });

    const a = await createOrGetChatThread("offer-1", true, true);
    const b = await createOrGetChatThread("offer-1", true, true);
    expect(a.id).toBe("cth_first");
    expect(b.id).toBe("cth_second");
    expect(mocked).toHaveBeenCalledWith("offer-1", true, true);
    expect(mocked).toHaveBeenCalledTimes(2);
  });
});
