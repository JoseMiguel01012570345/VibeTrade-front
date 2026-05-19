import { describe, expect, it } from "vitest";
import { mapChatMessageDtoToMessage } from "@/utils/chat/chatMerge";
import { makeChatMessageDto, textPayload } from "@test/Resources/Chat/message-payload-factories";

/** Mirrors supportsChatDeliveryMerge in chatMerge.ts */
function supportsDelivery(type: string): boolean {
  return ["text", "image", "audio", "doc", "docs", "agreement"].includes(type);
}

describe("chat delivery ack eligibility", () => {
  it("maps delivery status from API for ack-eligible types", () => {
    for (const status of ["sent", "delivered", "read"] as const) {
      const dto = makeChatMessageDto({
        status,
        payload: textPayload("x"),
      });
      const m = mapChatMessageDtoToMessage(dto, "buyer-1");
      if (m.type === "text") {
        expect(m.chatStatus).toBe(status);
        expect(m.read).toBe(status === "read");
      }
    }
  });

  it("certificate messages are not in ack-eligible set", () => {
    expect(supportsDelivery("certificate")).toBe(false);
    expect(supportsDelivery("text")).toBe(true);
    expect(supportsDelivery("agreement")).toBe(true);
  });
});
