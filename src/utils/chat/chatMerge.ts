import type { ChatDeliveryStatus, Message } from '../../app/store/marketStoreTypes'
import type { ChatMessageDto, ChatMessageStatusApi } from './chatApi'

function mapApiStatus(s: ChatMessageStatusApi): ChatDeliveryStatus {
  return s
}

export function mapChatMessageDtoToMessage(dto: ChatMessageDto, meId: string): Message {
  const at = Date.parse(dto.createdAtUtc)
  const from = dto.senderUserId === meId ? 'me' : 'other'
  const p = dto.payload
  const chatStatus = mapApiStatus(dto.status)
  const read =
    from === 'me' ? dto.status === 'read' : true
  if (p?.type === 'text' && typeof p.text === 'string') {
    return {
      id: dto.id,
      from,
      type: 'text',
      text: p.text,
      at,
      read,
      chatStatus,
      ...(typeof p.offerQaId === 'string' && p.offerQaId.length > 0
        ? { offerQaId: p.offerQaId }
        : {}),
    }
  }
  return {
    id: dto.id,
    from,
    type: 'text',
    text: '',
    at,
    read,
    chatStatus,
  }
}

/** Mensajes locales que no vienen del API (acuerdos, sistema, etc.). */
export function isLocalRichMessage(m: Message): boolean {
  if (m.type === 'agreement') return true
  if (m.type === 'certificate') return true
  if (m.type === 'text' && m.from === 'system') return true
  return false
}

/** Más antiguos primero (arriba en el hilo); desempate estable por id. */
export function sortMessagesChronological<T extends { at: number; id: string }>(
  messages: readonly T[],
): T[] {
  return [...messages].sort((a, b) => {
    const d = a.at - b.at
    return d !== 0 ? d : a.id.localeCompare(b.id)
  })
}

/** Evita el mismo mensaje dos veces (p. ej. POST + SignalR con el mismo id). */
export function dedupeMessagesById(messages: readonly Message[]): Message[] {
  const byId = new Map<string, Message>()
  for (const m of messages) {
    if (!byId.has(m.id)) byId.set(m.id, m)
  }
  return sortMessagesChronological([...byId.values()])
}

/**
 * Dos copias de la misma Q&A pública (ids distintos: local `m_*` + servidor `cmg_*`).
 * Conserva preferentemente el mensaje persistido `cmg_*`.
 */
export function dedupePublicQaMirrors(messages: readonly Message[]): Message[] {
  const byKey = new Map<string, Message>()
  for (const m of messages) {
    if (m.type !== 'text' || !m.offerQaId) continue
    const key = `${m.offerQaId}:${m.from}`
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, m)
      continue
    }
    const winner =
      m.id.startsWith('cmg_') && !prev.id.startsWith('cmg_')
        ? m
        : prev.id.startsWith('cmg_') && !m.id.startsWith('cmg_')
          ? prev
          : prev.at <= m.at
            ? prev
            : m
    byKey.set(key, winner)
  }
  const out: Message[] = []
  for (const m of sortMessagesChronological(messages)) {
    if (m.type !== 'text' || !m.offerQaId) {
      out.push(m)
      continue
    }
    const key = `${m.offerQaId}:${m.from}`
    const w = byKey.get(key)
    if (w && w.id === m.id) out.push(m)
  }
  return sortMessagesChronological(out)
}

export function normalizeThreadMessages(messages: readonly Message[]): Message[] {
  return dedupePublicQaMirrors(dedupeMessagesById(messages))
}

/**
 * Combina mensajes persistidos con estado local.
 * Si ya hay mensajes del servidor, descarta texto local que no sea sistema/acuerdo/pendiente
 * para no duplicar la misma consulta pública (offer.qa) que ya viene en `serverMapped`.
 */
export function mergePersistedChatMessages(
  serverMapped: Message[],
  existingLocal: Message[],
): Message[] {
  const hasServer = serverMapped.length > 0
  const preservedLocal = hasServer
    ? existingLocal.filter(
        (m) =>
          isLocalRichMessage(m) ||
          (typeof m.id === 'string' && m.id.startsWith('pend_')),
      )
    : existingLocal
  const combined = [...serverMapped, ...preservedLocal]
  return normalizeThreadMessages(combined)
}
