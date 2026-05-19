import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useChatScrollUnread } from "@features/chat/hooks/useChatScrollUnread";
import { CHAT_SCROLL_BOTTOM_PX } from "@features/chat/constants/chatScroll";
import { makeThread, makeTextMessage } from "@test/Resources/Chat/thread-factories";

describe("useChatScrollUnread", () => {
  it("jumpChatToBottom clears unread count and marks at bottom", () => {
    const thread = makeThread({
      messages: [
        makeTextMessage({ from: "other", id: "m1" }),
        makeTextMessage({ from: "other", id: "m2" }),
      ],
    });
    const { result } = renderHook(() => useChatScrollUnread(thread, thread.id));

    const el = document.createElement("div");
    Object.defineProperty(el, "scrollTop", { value: 0, writable: true });
    Object.defineProperty(el, "clientHeight", { value: 200, writable: true });
    Object.defineProperty(el, "scrollHeight", { value: 800, writable: true });
    el.scrollTo = () => {};

    act(() => {
      result.current.listRef.current = el;
      result.current.onChatListScroll();
    });

    expect(result.current.scrolledUpFromBottom).toBe(true);

    act(() => {
      result.current.jumpChatToBottom();
    });

    expect(result.current.unreadBelowCount).toBe(0);
    expect(result.current.scrolledUpFromBottom).toBe(false);
  });

  it("CHAT_SCROLL_BOTTOM_PX defines bottom threshold", () => {
    expect(CHAT_SCROLL_BOTTOM_PX).toBeGreaterThan(0);
  });
});
