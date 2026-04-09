import type { Message } from './marketStoreTypes'
import { collectReplyQuotes, threadIsActionLocked, uid } from './marketStoreHelpers'
import type { MarketSliceGet, MarketSliceSet } from './marketSliceTypes'
import type { MarketState } from './marketStoreTypes'

export function createChatMessagesSlice(set: MarketSliceSet, _get: MarketSliceGet): Pick<MarketState,
  | 'sendText'
  | 'sendAudio'
  | 'sendDocument'
  | 'sendImages'
  | 'sendDocsBundle'
> {
  return {
sendText: (threadId, text, replyToIds) => {
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const replyQuotes = collectReplyQuotes(th, replyToIds)
    const m: Message = {
      id: uid('m'),
      from: 'me',
      type: 'text',
      text: text.trim(),
      at: Date.now(),
      read: false,
      ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
    }
    return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
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
