import { describe, expect, it, vi } from "vitest";
import { mockPostAckPendingDeliveryOnLogin } from "@test/Resources/Chat/chat-api-mocks";

vi.mock("@/utils/chat/chatApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/chat/chatApi")>();
  const mocks = await import("@test/Resources/Chat/chat-api-mocks");
  return {
    ...actual,
    postAckPendingDeliveryOnLogin: (...args: unknown[]) =>
      mocks.mockPostAckPendingDeliveryOnLogin(...args),
  };
});

describe("postAckPendingDeliveryOnLogin", () => {
  it("is invoked after session bootstrap with token", async () => {
    const { postAckPendingDeliveryOnLogin } = await import("@/utils/chat/chatApi");
    mockPostAckPendingDeliveryOnLogin.mockResolvedValueOnce(2);
    const n = await postAckPendingDeliveryOnLogin();
    expect(n).toBe(2);
    expect(mockPostAckPendingDeliveryOnLogin).toHaveBeenCalled();
  });
});
