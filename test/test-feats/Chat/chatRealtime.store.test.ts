import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMarketStore } from "@app/store/useMarketStore";
import { useAppStore } from "@app/store/useAppStore";
import { seedAppStore } from "@test/Resources/Core/store-builders";
import {
  makeChatMessageDto,
  textPayload,
} from "@test/Resources/Chat/message-payload-factories";
import { makeThread, seedChatThread } from "@test/Resources/Chat/thread-factories";

vi.mock("@/utils/chat/chatApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/chat/chatApi")>();
  const mocks = await import("@test/Resources/Chat/chat-api-mocks");
  return {
    ...actual,
    patchChatMessageStatus: (...args: unknown[]) =>
      mocks.mockPatchChatMessageStatus(...args),
  };
});

describe("chat store realtime handlers", () => {
  beforeEach(() => {
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
    seedChatThread(makeThread({ id: "cth_rt_1", messages: [] }));
  });

  it("onChatMessageFromServer appends incoming message", () => {
    const dto = makeChatMessageDto({
      threadId: "cth_rt_1",
      senderUserId: "seller-1",
      payload: textPayload("Hola desde WS"),
    });
    useMarketStore.getState().onChatMessageFromServer("cth_rt_1", dto);
    const msgs = useMarketStore.getState().threads["cth_rt_1"]?.messages ?? [];
    expect(msgs.some((m) => m.type === "text" && m.text === "Hola desde WS")).toBe(
      true,
    );
  });

  it("onChatMessageStatusFromServer upgrades delivery status", () => {
    const dto = makeChatMessageDto({
      id: "cmg_own",
      threadId: "cth_rt_1",
      senderUserId: "buyer-1",
      status: "sent",
      payload: textPayload("propio"),
    });
    useMarketStore.getState().onChatMessageFromServer("cth_rt_1", dto);
    useMarketStore
      .getState()
      .onChatMessageStatusFromServer("cth_rt_1", "cmg_own", "read", new Date().toISOString());
    const msg = useMarketStore.getState().threads["cth_rt_1"]?.messages.find(
      (m) => m.id === "cmg_own",
    );
    expect(msg?.type === "text" && msg.chatStatus).toBe("read");
  });

  it("setTrustScore updates me and profileTrustScores for current user", () => {
    useAppStore.getState().setTrustScore(72);
    expect(useAppStore.getState().me.trustScore).toBe(72);
    expect(useAppStore.getState().profileTrustScores["buyer-1"]).toBe(72);
  });
});
