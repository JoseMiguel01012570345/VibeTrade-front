import { describe, expect, it } from "vitest";
import { mapChatMessageDtoToMessage } from "@/utils/chat/chatMerge";
import {
  agreementPayload,
  audioPayload,
  docPayload,
  docsBundlePayload,
  imagePayload,
  makeChatMessageDto,
} from "@test/Resources/Chat/message-payload-factories";

describe("ChatMessageList message mapping", () => {
  const meId = "buyer-1";

  it("maps multimedia and agreement payloads for rendering", () => {
    const cases = [
      { payload: imagePayload("/api/v1/media/i", "foto"), type: "image" },
      { payload: audioPayload("/api/v1/media/a", 8), type: "audio" },
      { payload: docPayload("doc.pdf", "/api/v1/media/d"), type: "doc" },
      { payload: docsBundlePayload("/u1", "/u2", "pack"), type: "docs" },
      { payload: agreementPayload("agr_1", "Contrato"), type: "agreement" },
    ];
    for (const c of cases) {
      const m = mapChatMessageDtoToMessage(
        makeChatMessageDto({ payload: c.payload, senderUserId: "seller-1" }),
        meId,
      );
      expect(m.type).toBe(c.type);
      expect(m.from).toBe("other");
    }
  });
});
