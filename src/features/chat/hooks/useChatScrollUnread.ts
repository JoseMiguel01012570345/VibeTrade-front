import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Thread } from "@app/store/marketStoreTypes";
import { normalizeThreadMessages } from "@/utils/chat/chatMerge";
import { CHAT_SCROLL_BOTTOM_PX } from "../constants/chatScroll";

export function useChatScrollUnread(thread: Thread | undefined, threadId: string | undefined) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const userWasAtBottomRef = useRef(true);
  const prevMessageCountInThreadRef = useRef(0);
  const chatListInitThreadIdRef = useRef<string | null>(null);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const [scrolledUpFromBottom, setScrolledUpFromBottom] = useState(false);

  const onChatListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const atBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - CHAT_SCROLL_BOTTOM_PX;
    userWasAtBottomRef.current = atBottom;
    setScrolledUpFromBottom(!atBottom);
    if (atBottom) {
      setUnreadBelowCount(0);
    }
  }, []);

  const jumpChatToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUnreadBelowCount(0);
    setScrolledUpFromBottom(false);
    userWasAtBottomRef.current = true;
  }, []);

  useLayoutEffect(() => {
    if (!thread) {
      if (!threadId) {
        chatListInitThreadIdRef.current = null;
        prevMessageCountInThreadRef.current = 0;
        setUnreadBelowCount(0);
        setScrolledUpFromBottom(false);
      }
      return;
    }
    const el = listRef.current;
    const n = thread.messages.length;
    const tid = thread.id;
    if (!el) {
      return;
    }
    if (chatListInitThreadIdRef.current !== tid) {
      chatListInitThreadIdRef.current = tid;
      el.scrollTo({ top: el.scrollHeight });
      prevMessageCountInThreadRef.current = n;
      setUnreadBelowCount(0);
      userWasAtBottomRef.current = true;
      queueMicrotask(() => {
        onChatListScroll();
      });
      return;
    }
    if (n < prevMessageCountInThreadRef.current) {
      prevMessageCountInThreadRef.current = n;
      return;
    }
    if (n > prevMessageCountInThreadRef.current) {
      const added = n - prevMessageCountInThreadRef.current;
      const ordered = normalizeThreadMessages(thread.messages);
      const newSlice = ordered.slice(-added);
      const unreadFromNonMe = newSlice.filter((m) => m.from !== "me").length;
      if (userWasAtBottomRef.current) {
        el.scrollTo({ top: el.scrollHeight });
        setUnreadBelowCount(0);
        queueMicrotask(() => {
          onChatListScroll();
        });
      } else if (unreadFromNonMe > 0) {
        setUnreadBelowCount((c) => c + unreadFromNonMe);
      }
    }
    prevMessageCountInThreadRef.current = n;
  }, [thread, threadId, onChatListScroll]);

  useEffect(() => {
    if (!thread) return;
    const root = listRef.current;
    const target = listEndRef.current;
    if (!root || !target) return;
    const o = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setUnreadBelowCount(0);
            setScrolledUpFromBottom(false);
            userWasAtBottomRef.current = true;
          }
        }
      },
      { root, rootMargin: "0px", threshold: 0.01 },
    );
    o.observe(target);
    return () => o.disconnect();
  }, [thread?.id, thread?.messages.length]);

  return {
    listRef,
    listEndRef,
    onChatListScroll,
    jumpChatToBottom,
    scrolledUpFromBottom,
    unreadBelowCount,
  };
}
