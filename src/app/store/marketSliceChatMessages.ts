import type { ChatDeliveryStatus, Message } from './marketStoreTypes'
import { collectReplyQuotes, threadIsActionLocked, uid } from './marketStoreHelpers'
import type { MarketSliceGet, MarketSliceSet } from './marketSliceTypes'
import type { MarketState } from './marketStoreTypes'
import type { ChatMessageDto } from '../../utils/chat/chatApi'
import { postChatTextMessage } from '../../utils/chat/chatApi'
import { mapChatMessageDtoToMessage, normalizeThreadMessages } from '../../utils/chat/chatMerge'
import { useAppStore } from './useAppStore'

export function createChatMessagesSlice(set: MarketSliceSet, get: MarketSliceGet): Pick<MarketState,
  | 'onChatMessageFromServer'
  | 'onChatMessageStatusFromServer'
  | 'sendText'
  | 'sendAudio'
  | 'sendDocument'
  | 'sendImages'
  | 'sendDocsBundle'
> {
  return {
onChatMessageFromServer: (threadId, dto: ChatMessageDto) => {
  const meId = useAppStore.getState().me.id
  const m = mapChatMessageDtoToMessage(dto, meId)
  set((s) => {
    const t = s.threads[threadId]
    if (!t) return s
    let messages = t.messages
    if (dto.senderUserId === meId) {
      const pendIdx = messages.findIndex(
        (x) => x.id.startsWith('pend_') && x.type === 'text' && x.from === 'me',
      )
      if (pendIdx >= 0) {
        messages = messages.filter((_, i) => i !== pendIdx)
      }
    }
    const idx = messages.findIndex((x) => x.id === m.id)
    if (idx >= 0) {
      const next = [...messages]
      next[idx] = m
      return {
        ...s,
        threads: {
          ...s.threads,
          [threadId]: { ...t, messages: normalizeThreadMessages(next) },
        },
      }
    }
    return {
      ...s,
      threads: {
        ...s.threads,
        [threadId]: { ...t, messages: normalizeThreadMessages([...messages, m]) },
      },
    }
  })
},

onChatMessageStatusFromServer: (threadId, messageId, statusStr) => {
  const status = statusStr as ChatDeliveryStatus
  set((s) => {
    const t = s.threads[threadId]
    if (!t) return s
    const messages = t.messages.map((msg) => {
      if (msg.id !== messageId || msg.type !== 'text') return msg
      const read = msg.from === 'me' ? status === 'read' : msg.read
      return { ...msg, chatStatus: status, read }
    })
    return { ...s, threads: { ...s.threads, [threadId]: { ...t, messages } } }
  })
},

sendText: (threadId, text, replyToIds) => {
  const trimmed = text.trim()
  if (!trimmed) return
  const th = get().threads[threadId]
  if (!th || threadIsActionLocked(th)) return

  if (threadId.startsWith('cth_')) {
    const pendingId = `pend_${uid('m')}`
    set((s) => {
      const t = s.threads[threadId]
      if (!t || threadIsActionLocked(t)) return s
      const replyQuotes = collectReplyQuotes(t, replyToIds)
      const pending: Message = {
        id: pendingId,
        from: 'me',
        type: 'text',
        text: trimmed,
        at: Date.now(),
        read: false,
        chatStatus: 'pending',
        ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
      }
      return {
        ...s,
        threads: {
          ...s.threads,
          [threadId]: { ...t, messages: [...t.messages, pending] },
        },
      }
    })
    void (async () => {
      try {
        const dto = await postChatTextMessage(threadId, trimmed)
        const meId = useAppStore.getState().me.id
        const base = mapChatMessageDtoToMessage(dto, meId)
        const replyQuotes = collectReplyQuotes(th, replyToIds)
        const m: Message =
          base.type === 'text' && replyQuotes && replyQuotes.length
            ? { ...base, replyQuotes }
            : base
        set((s) => {
          const t = s.threads[threadId]
          if (!t) return s
          const withoutPending = t.messages.filter(
            (x) => x.id !== pendingId && x.id !== m.id,
          )
          return {
            ...s,
            threads: {
              ...s.threads,
              [threadId]: {
                ...t,
                messages: normalizeThreadMessages([...withoutPending, m]),
              },
            },
          }
        })
      } catch (e) {
        console.error(e)
        set((s) => {
          const t = s.threads[threadId]
          if (!t) return s
          const messages = t.messages.map((x) =>
            x.id === pendingId && x.type === 'text'
              ? { ...x, chatStatus: 'error' as const }
              : x,
          )
          return {
            ...s,
            threads: { ...s.threads, [threadId]: { ...t, messages } },
          }
        })
      }
    })()
    return
  }

  set((s) => {
    const t = s.threads[threadId]
    if (!t || threadIsActionLocked(t)) return s
    const replyQuotes = collectReplyQuotes(t, replyToIds)
    const m: Message = {
      id: uid('m'),
      from: 'me',
      type: 'text',
      text: trimmed,
      at: Date.now(),
      read: false,
      ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
    }
    return { ...s, threads: { ...s.threads, [threadId]: { ...t, messages: [...t.messages, m] } } }
  })
},

sendAudio: (threadId, payload, options) => {
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const replyQuotes = collectReplyQuotes(th, options?.replyToIds)
    const m: Message = {
      id: uid('m'),
      from: 'me',
      type: 'audio',
      url: payload.url,
      seconds: Math.max(1, Math.round(payload.seconds)),
      at: Date.now(),
      read: false,
      ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
    }
    return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
  })
},

sendDocument: (threadId, payload, options) => {
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const replyQuotes = collectReplyQuotes(th, options?.replyToIds)
    const cap = options?.caption?.trim()
    const m: Message = {
      id: uid('m'),
      from: 'me',
      type: 'doc',
      name: payload.name,
      size: payload.size,
      kind: payload.kind,
      url: payload.url,
      at: Date.now(),
      read: false,
      ...(cap ? { caption: cap } : {}),
      ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
    }
    return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
  })
},

sendImages: (threadId, images, options) => {
  if (!images.length) return
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const replyQuotes = collectReplyQuotes(th, options?.replyToIds)
    const cap = options?.caption?.trim()
    const audio = options?.embeddedAudio
    const m: Message = {
      id: uid('m'),
      from: 'me',
      type: 'image',
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
    }
    return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
  })
},

sendDocsBundle: (threadId, payload, options) => {
  if (!payload.documents.length) return
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const replyQuotes = collectReplyQuotes(th, options?.replyToIds)
    const cap = options?.caption?.trim()
    const audio = payload.embeddedAudio
    const m: Message = {
      id: uid('m'),
      from: 'me',
      type: 'docs',
      documents: payload.documents.map((d) => ({
        name: d.name,
        size: d.size,
        kind: d.kind,
        url: d.url,
      })),
      at: Date.now(),
      read: false,
      ...(cap ? { caption: cap } : {}),
      ...(audio ? { embeddedAudio: { url: audio.url, seconds: Math.max(1, Math.round(audio.seconds)) } } : {}),
      ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
    }
    return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
  })
},
  }
}
