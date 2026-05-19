import { describe, expect, it } from "vitest";
import {
  mapChatMessageDtoToMessage,
  preferHigherDeliveryStatus,
  upsertMessageMergeDelivery,
} from "@/utils/chat/chatMerge";
import {
  audioPayload,
  docPayload,
  docsBundlePayload,
  imagePayload,
  makeChatMessageDto,
  textPayload,
} from "@test/Resources/Chat/message-payload-factories";
import {
  assertAudioPayload,
  assertImagePayload,
  assertTextPayload,
} from "@test/Resources/Chat/payload-assertions";
import { collectReplyQuotes } from "@app/store/marketStoreHelpers";
import { makeThread, makeTextMessage } from "@test/Resources/Chat/thread-factories";

describe("chatMerge payloads and replies", () => {
  it("maps image DTO to message with caption", () => {
    const dto = makeChatMessageDto({
      payload: imagePayload("/api/v1/media/x", "cap-img"),
    });
    assertImagePayload(dto, "/api/v1/media/x", "cap-img");
    const m = mapChatMessageDtoToMessage(dto, "buyer-1");
    expect(m.type).toBe("image");
    if (m.type === "image") {
      expect(m.images[0]?.url).toBe("/api/v1/media/x");
      expect(m.caption).toBe("cap-img");
    }
  });

  it("maps audio with reply targets", () => {
    const dto = makeChatMessageDto({
      payload: audioPayload("/api/v1/media/a", 12, ["cmg_prev"]),
    });
    assertAudioPayload(dto, "/api/v1/media/a", 12, "cmg_prev");
    const m = mapChatMessageDtoToMessage(dto, "seller-1");
    expect(m.type).toBe("audio");
    if (m.type === "audio") {
      expect(m.url).toBe("/api/v1/media/a");
      expect(m.seconds).toBe(12);
    }
  });

  it("maps docs bundle and doc single", () => {
    const docsDto = makeChatMessageDto({
      payload: docsBundlePayload("/u1", "/u2", "bundle-cap", ["cmg_img"]),
    });
    const docDto = makeChatMessageDto({
      id: "cmg_doc",
      payload: docPayload("file.pdf", "/api/v1/media/d", "doc-cap"),
    });
    expect(mapChatMessageDtoToMessage(docsDto, "b").type).toBe("docs");
    expect(mapChatMessageDtoToMessage(docDto, "b").type).toBe("doc");
  });

  it("preferHigherDeliveryStatus never downgrades", () => {
    expect(preferHigherDeliveryStatus("delivered", "sent")).toBe("delivered");
    expect(preferHigherDeliveryStatus("read", "delivered")).toBe("read");
  });

  it("upsertMessageMergeDelivery preserves higher status", () => {
    const prev = mapChatMessageDtoToMessage(
      makeChatMessageDto({
        id: "m1",
        status: "delivered",
        payload: textPayload("hi"),
      }),
      "me",
    );
    const incoming = mapChatMessageDtoToMessage(
      makeChatMessageDto({
        id: "m1",
        status: "sent",
        payload: textPayload("hi"),
      }),
      "me",
    );
    const merged = upsertMessageMergeDelivery([prev], incoming);
    expect(merged).toHaveLength(1);
    if (merged[0]?.type === "text") {
      expect(merged[0].chatStatus).toBe("delivered");
    }
  });

  it("collectReplyQuotes skips certificate and keeps user messages", () => {
    const th = makeThread({
      messages: [
        makeTextMessage({
          id: "sys1",
          from: "system",
          text: "Aviso del sistema",
        }),
        makeTextMessage({ id: "t1", from: "other", text: "Hola" }),
      ],
    });
    const quotes = collectReplyQuotes(th, ["sys1", "t1"]);
    expect(quotes).toHaveLength(2);
    expect(quotes!.map((q) => q.id)).toEqual(["sys1", "t1"]);
  });

  it("text payload with reply", () => {
    const dto = makeChatMessageDto({
      payload: textPayload("reply text", { replyToIds: ["cmg_x"] }),
    });
    assertTextPayload(dto, "reply text", "cmg_x");
  });
});
