import { describe, expect, it } from "vitest";
import {
  buildPostImageBody,
  buildPostTextBody,
  buildPostVoiceBody,
} from "@/utils/chat/chatMessagePayloadContract";
import { mapChatMessageDtoToMessage } from "@/utils/chat/chatMerge";
import { makeChatMessageDto } from "@test/Resources/Chat/message-payload-factories";

describe("chatMessagePayloadContract (backend-aligned)", () => {
  it("POST bodies omit type discriminator", () => {
    expect(buildPostTextBody("hola")).toEqual({ text: "hola" });
    expect(buildPostVoiceBody("/v", 5)).toEqual({ url: "/v", seconds: 5 });
    expect(buildPostImageBody([{ url: "/i" }], { caption: "c" })).toEqual({
      images: [{ url: "/i" }],
      caption: "c",
    });
  });

  it("maps unified voice response (voiceUrl, not url+type)", () => {
    const m = mapChatMessageDtoToMessage(
      makeChatMessageDto({
        payload: { voiceUrl: "/api/v1/media/a", voiceSeconds: 8 },
      }),
      "buyer-1",
    );
    expect(m.type).toBe("audio");
    if (m.type === "audio") {
      expect(m.url).toBe("/api/v1/media/a");
      expect(m.seconds).toBe(8);
    }
  });
});
