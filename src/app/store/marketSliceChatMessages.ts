import type { ChatDeliveryStatus, Message } from "./marketStoreTypes";
import {
  collectReplyQuotes,
  threadIsActionLocked,
  uid,
} from "./marketStoreHelpers";
import type { MarketSliceGet, MarketSliceSet } from "./marketSliceTypes";
import type { MarketState } from "./marketStoreTypes";
import { getSessionToken } from "../../utils/http/sessionToken";
import type { ChatMessageDto } from "../../utils/chat/chatApi";
import { postChatMessage, postChatTextMessage } from "../../utils/chat/chatApi";
import {
  mapChatMessageDtoToMessage,
  normalizeThreadMessages,
  preferHigherDeliveryStatus,
  upsertMessageMergeDelivery,
} from "../../utils/chat/chatMerge";
import { mediaApiUrl, uploadMediaBlob } from "../../utils/media/mediaClient";
import { useAppStore } from "./useAppStore";
import { mergeChatSenderLabelsIntoProfileStore } from "../../utils/chat/chatSenderLabels";

async function blobUrlToMediaApiUrl(
  blobUrl: string,
  fileName: string,
  mimeHint?: string,
): Promise<string> {
  const blob = await fetch(blobUrl).then((r) => r.blob());
  const uploaded = await uploadMediaBlob(
    blob,
    fileName,
    mimeHint || blob.type,
  );
  return mediaApiUrl(uploaded.id);
}

const threadContractsRefreshAfterMessageTimer = new Map<
  string,
  ReturnType<typeof setTimeout>
>();

/**
 * Un mensaje vía SignalR (p. ej. aviso de sistema al editar un acuerdo) no actualiza
 * `thread.contracts` por sí solo; el comprador seguía viendo título/estado viejos en la
 * burbuja hasta un refetch. Tras un breve debounce, alineamos contratos con GET.
 */
function scheduleThreadContractsSyncAfterMessage(
  get: MarketSliceGet,
  threadId: string,
) {
  if (!threadId.startsWith("cth_") || !getSessionToken()) return;
  const prev = threadContractsRefreshAfterMessageTimer.get(threadId);
  if (prev !== undefined) clearTimeout(prev);
  threadContractsRefreshAfterMessageTimer.set(
    threadId,
    setTimeout(() => {
      threadContractsRefreshAfterMessageTimer.delete(threadId);
      void get().refreshThreadTradeAgreements(threadId);
    }, 300),
  );
}

export function createChatMessagesSlice(
  set: MarketSliceSet,
  get: MarketSliceGet,
): Pick<
  MarketState,
  | "onChatMessageFromServer"
  | "onParticipantLeftFromServer"
  | "onChatMessageStatusFromServer"
  | "sendText"
  | "sendAudio"
  | "sendDocument"
  | "sendImages"
  | "sendDocsBundle"
> {
  return {
    onParticipantLeftFromServer: (threadId, userId, displayName) => {
      const text = `${displayName} salió del chat`;
      const m: Message = {
        id: `sys_leave_${uid("m")}`,
        from: "system",
        type: "text",
        text,
        at: Date.now(),
      };
      const leftId = userId?.trim() ?? "";
      set((s) => {
        const t = s.threads[threadId];
        if (!t) return s;
        const carriers = t.chatCarriers ?? [];
        const wasCarrier =
          leftId.length > 0 && carriers.some((c) => c.id === leftId);
        const cc = wasCarrier
          ? carriers.filter((c) => c.id !== leftId)
          : carriers;
        const chatCarriers =
          wasCarrier && cc.length !== carriers.length ? cc : t.chatCarriers;
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: {
              ...t,
              ...(chatCarriers !== t.chatCarriers ? { chatCarriers } : {}),
              messages: normalizeThreadMessages([...t.messages, m]),
            },
          },
        };
      });
    },

    onChatMessageFromServer: (threadId, dto: ChatMessageDto) => {
      mergeChatSenderLabelsIntoProfileStore([dto]);
      const meId = useAppStore.getState().me.id;
      const m = mapChatMessageDtoToMessage(dto, meId);
      set((s) => {
        const t = s.threads[threadId];
        if (!t) return s;
        let messages = t.messages;
        if (dto.senderUserId === meId) {
          const pendIdx = messages.findIndex(
            (x) =>
              x.id.startsWith("pend_") && x.type === "text" && x.from === "me",
          );
          if (pendIdx >= 0) {
            messages = messages.filter((_, i) => i !== pendIdx);
          }
        }
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: {
              ...t,
              messages: upsertMessageMergeDelivery(messages, m),
            },
          },
        };
      });
      scheduleThreadContractsSyncAfterMessage(get, threadId);
    },

    onChatMessageStatusFromServer: (threadId, messageId, statusStr, _updatedAtUtc) => {
      const status = statusStr as ChatDeliveryStatus;
      set((s) => {
        const t = s.threads[threadId];
        if (!t) return s;
        const messages = t.messages.map((msg) => {
          if (msg.id !== messageId || msg.from !== "me") return msg;
          if (
            msg.type === "text" ||
            msg.type === "image" ||
            msg.type === "audio" ||
            msg.type === "doc" ||
            msg.type === "docs" ||
            msg.type === "agreement"
          ) {
            const prevSt = "chatStatus" in msg ? msg.chatStatus : undefined;
            const mergedStatus =
              preferHigherDeliveryStatus(prevSt, status) ?? status;
            const read = mergedStatus === "read";
            return { ...msg, chatStatus: mergedStatus, read };
          }
          return msg;
        });
        return {
          ...s,
          threads: { ...s.threads, [threadId]: { ...t, messages } },
        };
      });
    },

    sendText: (threadId, text, replyToIds) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const th = get().threads[threadId];
      if (!th || threadIsActionLocked(th)) return;

      if (threadId.startsWith("cth_")) {
        const pendingId = `pend_${uid("m")}`;
        set((s) => {
          const t = s.threads[threadId];
          if (!t || threadIsActionLocked(t)) return s;
          const replyQuotes = collectReplyQuotes(t, replyToIds);
          const pending: Message = {
            id: pendingId,
            from: "me",
            type: "text",
            text: trimmed,
            at: Date.now(),
            read: false,
            chatStatus: "pending",
            ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
          };
          return {
            ...s,
            threads: {
              ...s.threads,
              [threadId]: { ...t, messages: [...t.messages, pending] },
            },
          };
        });
        void (async () => {
          try {
            const dto = await postChatTextMessage(threadId, trimmed, {
              replyToIds: replyToIds?.filter(Boolean),
            });
            mergeChatSenderLabelsIntoProfileStore([dto]);
            const meId = useAppStore.getState().me.id;
            const m = mapChatMessageDtoToMessage(dto, meId);
            set((s) => {
              const t = s.threads[threadId];
              if (!t) return s;
              const withoutPending = t.messages.filter(
                (x) => x.id !== pendingId,
              );
              return {
                ...s,
                threads: {
                  ...s.threads,
                  [threadId]: {
                    ...t,
                    messages: upsertMessageMergeDelivery(withoutPending, m),
                  },
                },
              };
            });
          } catch (e) {
            console.error(e);
            set((s) => {
              const t = s.threads[threadId];
              if (!t) return s;
              const messages = t.messages.map((x) =>
                x.id === pendingId && x.type === "text"
                  ? { ...x, chatStatus: "error" as const }
                  : x,
              );
              return {
                ...s,
                threads: { ...s.threads, [threadId]: { ...t, messages } },
              };
            });
          }
        })();
        return;
      }

      set((s) => {
        const t = s.threads[threadId];
        if (!t || threadIsActionLocked(t)) return s;
        const replyQuotes = collectReplyQuotes(t, replyToIds);
        const m: Message = {
          id: uid("m"),
          from: "me",
          type: "text",
          text: trimmed,
          at: Date.now(),
          read: false,
          ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
        };
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: { ...t, messages: [...t.messages, m] },
          },
        };
      });
    },

    sendAudio: (threadId, payload, options) => {
      const th = get().threads[threadId];
      if (!th || threadIsActionLocked(th)) return;

      if (threadId.startsWith("cth_")) {
        void (async () => {
          try {
            const url = await blobUrlToMediaApiUrl(
              payload.url,
              "voice.webm",
              "audio/webm",
            );
            const body: Record<string, unknown> = {
              type: "audio",
              url,
              seconds: Math.max(1, Math.round(payload.seconds)),
            };
            if (options?.replyToIds?.length)
              body.replyToIds = options.replyToIds;
            const dto = await postChatMessage(threadId, body);
            mergeChatSenderLabelsIntoProfileStore([dto]);
            const meId = useAppStore.getState().me.id;
            const m = mapChatMessageDtoToMessage(dto, meId);
            set((s) => {
              const t = s.threads[threadId];
              if (!t) return s;
              return {
                ...s,
                threads: {
                  ...s.threads,
                  [threadId]: {
                    ...t,
                    messages: upsertMessageMergeDelivery(t.messages, m),
                  },
                },
              };
            });
          } catch (e) {
            console.error(e);
          }
        })();
        return;
      }

      set((s) => {
        const h = s.threads[threadId];
        if (!h || threadIsActionLocked(h)) return s;
        const replyQuotes = collectReplyQuotes(h, options?.replyToIds);
        const m: Message = {
          id: uid("m"),
          from: "me",
          type: "audio",
          url: payload.url,
          seconds: Math.max(1, Math.round(payload.seconds)),
          at: Date.now(),
          read: false,
          ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
        };
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: { ...h, messages: [...h.messages, m] },
          },
        };
      });
    },

    sendDocument: (threadId, payload, options) => {
      const th = get().threads[threadId];
      if (!th || threadIsActionLocked(th)) return;

      if (threadId.startsWith("cth_")) {
        void (async () => {
          try {
            const url = await blobUrlToMediaApiUrl(
              payload.url,
              payload.name,
              "application/octet-stream",
            );
            const body: Record<string, unknown> = {
              type: "doc",
              name: payload.name,
              size: payload.size,
              kind: payload.kind,
              url,
            };
            const cap = options?.caption?.trim();
            if (cap) body.caption = cap;
            if (options?.replyToIds?.length)
              body.replyToIds = options.replyToIds;
            const dto = await postChatMessage(threadId, body);
            mergeChatSenderLabelsIntoProfileStore([dto]);
            const meId = useAppStore.getState().me.id;
            const m = mapChatMessageDtoToMessage(dto, meId);
            set((s) => {
              const t = s.threads[threadId];
              if (!t) return s;
              return {
                ...s,
                threads: {
                  ...s.threads,
                  [threadId]: {
                    ...t,
                    messages: upsertMessageMergeDelivery(t.messages, m),
                  },
                },
              };
            });
          } catch (e) {
            console.error(e);
          }
        })();
        return;
      }

      set((s) => {
        const h = s.threads[threadId];
        if (!h || threadIsActionLocked(h)) return s;
        const replyQuotes = collectReplyQuotes(h, options?.replyToIds);
        const cap = options?.caption?.trim();
        const m: Message = {
          id: uid("m"),
          from: "me",
          type: "doc",
          name: payload.name,
          size: payload.size,
          kind: payload.kind,
          url: payload.url,
          at: Date.now(),
          read: false,
          ...(cap ? { caption: cap } : {}),
          ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
        };
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: { ...h, messages: [...h.messages, m] },
          },
        };
      });
    },

    sendImages: (threadId, images, options) => {
      if (!images.length) return;
      const th = get().threads[threadId];
      if (!th || threadIsActionLocked(th)) return;

      if (threadId.startsWith("cth_")) {
        void (async () => {
          try {
            const uploaded: { url: string }[] = [];
            for (let i = 0; i < images.length; i++) {
              const u = await blobUrlToMediaApiUrl(
                images[i].url,
                `photo_${i}.jpg`,
                "image/jpeg",
              );
              uploaded.push({ url: u });
            }
            const body: Record<string, unknown> = {
              type: "image",
              images: uploaded,
            };
            const cap = options?.caption?.trim();
            if (cap) body.caption = cap;
            if (options?.embeddedAudio) {
              const au = await blobUrlToMediaApiUrl(
                options.embeddedAudio.url,
                "voice-embed.webm",
                "audio/webm",
              );
              body.embeddedAudio = {
                url: au,
                seconds: Math.max(
                  1,
                  Math.round(options.embeddedAudio.seconds),
                ),
              };
            }
            if (options?.replyToIds?.length)
              body.replyToIds = options.replyToIds;
            const dto = await postChatMessage(threadId, body);
            mergeChatSenderLabelsIntoProfileStore([dto]);
            const meId = useAppStore.getState().me.id;
            const m = mapChatMessageDtoToMessage(dto, meId);
            set((s) => {
              const t = s.threads[threadId];
              if (!t) return s;
              return {
                ...s,
                threads: {
                  ...s.threads,
                  [threadId]: {
                    ...t,
                    messages: upsertMessageMergeDelivery(t.messages, m),
                  },
                },
              };
            });
          } catch (e) {
            console.error(e);
          }
        })();
        return;
      }

      set((s) => {
        const h = s.threads[threadId];
        if (!h || threadIsActionLocked(h)) return s;
        const replyQuotes = collectReplyQuotes(h, options?.replyToIds);
        const cap = options?.caption?.trim();
        const audio = options?.embeddedAudio;
        const m: Message = {
          id: uid("m"),
          from: "me",
          type: "image",
          images,
          at: Date.now(),
          read: false,
          ...(cap ? { caption: cap } : {}),
          ...(audio
            ? {
                embeddedAudio: {
                  url: audio.url,
                  seconds: Math.max(1, Math.round(audio.seconds)),
                },
              }
            : {}),
          ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
        };
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: { ...h, messages: [...h.messages, m] },
          },
        };
      });
    },

    sendDocsBundle: (threadId, payload, options) => {
      if (!payload.documents.length) return;
      const th = get().threads[threadId];
      if (!th || threadIsActionLocked(th)) return;

      if (threadId.startsWith("cth_")) {
        void (async () => {
          try {
            const documents: {
              name: string;
              size: string;
              kind: "pdf" | "doc" | "other";
              url?: string;
            }[] = [];
            for (const d of payload.documents) {
              const u = await blobUrlToMediaApiUrl(
                d.url ?? "",
                d.name,
                "application/octet-stream",
              );
              documents.push({
                name: d.name,
                size: d.size,
                kind: d.kind,
                url: u,
              });
            }
            const body: Record<string, unknown> = {
              type: "docs",
              documents,
            };
            const cap = options?.caption?.trim();
            if (cap) body.caption = cap;
            if (payload.embeddedAudio) {
              const au = await blobUrlToMediaApiUrl(
                payload.embeddedAudio.url,
                "voice-embed.webm",
                "audio/webm",
              );
              body.embeddedAudio = {
                url: au,
                seconds: Math.max(1, Math.round(payload.embeddedAudio.seconds)),
              };
            }
            if (options?.replyToIds?.length)
              body.replyToIds = options.replyToIds;
            const dto = await postChatMessage(threadId, body);
            mergeChatSenderLabelsIntoProfileStore([dto]);
            const meId = useAppStore.getState().me.id;
            const m = mapChatMessageDtoToMessage(dto, meId);
            set((s) => {
              const t = s.threads[threadId];
              if (!t) return s;
              return {
                ...s,
                threads: {
                  ...s.threads,
                  [threadId]: {
                    ...t,
                    messages: upsertMessageMergeDelivery(t.messages, m),
                  },
                },
              };
            });
          } catch (e) {
            console.error(e);
          }
        })();
        return;
      }

      set((s) => {
        const h = s.threads[threadId];
        if (!h || threadIsActionLocked(h)) return s;
        const replyQuotes = collectReplyQuotes(h, options?.replyToIds);
        const cap = options?.caption?.trim();
        const audio = payload.embeddedAudio;
        const m: Message = {
          id: uid("m"),
          from: "me",
          type: "docs",
          documents: payload.documents.map((d) => ({
            name: d.name,
            size: d.size,
            kind: d.kind,
            url: d.url,
          })),
          at: Date.now(),
          read: false,
          ...(cap ? { caption: cap } : {}),
          ...(audio
            ? {
                embeddedAudio: {
                  url: audio.url,
                  seconds: Math.max(1, Math.round(audio.seconds)),
                },
              }
            : {}),
          ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
        };
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: { ...h, messages: [...h.messages, m] },
          },
        };
      });
    },
  };
}
