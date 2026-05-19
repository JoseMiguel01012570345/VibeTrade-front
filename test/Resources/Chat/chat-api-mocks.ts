import { vi } from "vitest";

export const mockPostChatMessage = vi.fn();
export const mockPostChatTextMessage = vi.fn();
export const mockCreateOrGetChatThread = vi.fn();
export const mockPatchChatMessageStatus = vi.fn();
export const mockPostAckPendingDeliveryOnLogin = vi.fn();
export const mockFetchChatMessages = vi.fn();
export const mockFetchChatThread = vi.fn();
export const mockUploadMediaBlob = vi.fn();

export function resetChatApiMocks() {
  mockPostChatMessage.mockResolvedValue({
    id: "cmg_new",
    threadId: "cth_test_001",
    senderUserId: "buyer-1",
    status: "sent",
    createdAtUtc: new Date().toISOString(),
    payload: { text: "ok" },
  });
  mockPostChatTextMessage.mockResolvedValue(undefined);
  mockCreateOrGetChatThread.mockResolvedValue({
    id: "cth_test_001",
    offerId: "offer-1",
    storeId: "store-1",
    buyerUserId: "buyer-1",
    sellerUserId: "seller-1",
    initiatorUserId: "buyer-1",
    purchaseMode: true,
    createdAtUtc: new Date().toISOString(),
    firstMessageSentAtUtc: null,
  });
  mockPatchChatMessageStatus.mockResolvedValue(undefined);
  mockPostAckPendingDeliveryOnLogin.mockResolvedValue(0);
  mockFetchChatMessages.mockResolvedValue([]);
  mockFetchChatThread.mockResolvedValue({
    id: "cth_test_001",
    offerId: "offer-1",
    storeId: "store-1",
    buyerUserId: "buyer-1",
    sellerUserId: "seller-1",
    initiatorUserId: "buyer-1",
    purchaseMode: true,
    createdAtUtc: new Date().toISOString(),
    firstMessageSentAtUtc: null,
  });
  mockUploadMediaBlob.mockResolvedValue({ id: "media_test_1" });
}

