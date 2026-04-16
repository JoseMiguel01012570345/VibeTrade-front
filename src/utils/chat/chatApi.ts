import { apiFetch } from '../http/apiClient'
import { getSessionToken } from '../http/sessionToken'

export type ChatThreadDto = {
  id: string
  offerId: string
  storeId: string
  buyerUserId: string
  sellerUserId: string
  initiatorUserId: string
  firstMessageSentAtUtc: string | null
  createdAtUtc: string
  /** false = hilo originado solo por consultas desde la ficha; true = flujo Comprar (chat). */
  purchaseMode: boolean
}

/** Aligned with backend <see cref="VibeTrade.Backend.Data.ChatMessageStatus" /> (camelCase JSON). */
export type ChatMessageStatusApi =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'error'

export type ChatMessageDto = {
  id: string
  threadId: string
  senderUserId: string
  payload: { type?: string; text?: string; offerQaId?: string }
  status: ChatMessageStatusApi
  createdAtUtc: string
  updatedAtUtc: string | null
}

export type ChatThreadSummaryDto = {
  id: string
  offerId: string
  storeId: string
  createdAtUtc: string
  lastMessageAtUtc: string | null
  lastPreview: string | null
  purchaseMode: boolean
}

export type ChatNotificationDto = {
  id: string
  threadId: string
  messageId: string
  messagePreview: string
  /** Nombre tienda o nombre del comprador (según emisor). */
  authorLabel: string
  authorTrustScore: number
  senderUserId: string
  createdAtUtc: string
  readAtUtc: string | null
}

export async function createOrGetChatThread(
  offerId: string,
  purchaseIntent: boolean = true,
): Promise<ChatThreadDto> {
  const res = await apiFetch('/api/v1/chat/threads', {
    method: 'POST',
    body: JSON.stringify({ offerId, purchaseIntent }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
  return (await res.json()) as ChatThreadDto
}

export async function deleteChatThread(threadId: string): Promise<void> {
  const res = await apiFetch(`/api/v1/chat/threads/${encodeURIComponent(threadId)}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `HTTP ${res.status}`)
  }
}

export async function fetchChatThread(threadId: string): Promise<ChatThreadDto> {
  const res = await apiFetch(`/api/v1/chat/threads/${encodeURIComponent(threadId)}`, {
    method: 'GET',
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as ChatThreadDto
}

export async function fetchChatThreadByOffer(offerId: string): Promise<ChatThreadDto | null> {
  const res = await apiFetch(
    `/api/v1/chat/threads/by-offer/${encodeURIComponent(offerId)}`,
    { method: 'GET' },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as ChatThreadDto
}

export async function fetchChatMessages(threadId: string): Promise<ChatMessageDto[]> {
  const res = await apiFetch(`/api/v1/chat/threads/${encodeURIComponent(threadId)}/messages`, {
    method: 'GET',
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as ChatMessageDto[]
}

export async function postChatTextMessage(
  threadId: string,
  text: string,
): Promise<ChatMessageDto> {
  const res = await apiFetch(`/api/v1/chat/threads/${encodeURIComponent(threadId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ type: 'text', text }),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as ChatMessageDto
}

export async function fetchChatThreads(): Promise<ChatThreadSummaryDto[]> {
  const res = await apiFetch('/api/v1/chat/threads', { method: 'GET' })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as ChatThreadSummaryDto[]
}

export async function fetchChatNotifications(): Promise<ChatNotificationDto[]> {
  const res = await apiFetch('/api/v1/me/notifications', { method: 'GET' })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as ChatNotificationDto[]
}

export async function patchChatMessageStatus(
  threadId: string,
  messageId: string,
  status: 'delivered' | 'read',
): Promise<ChatMessageDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/status`,
    {
      method: 'POST',
      body: JSON.stringify({ status }),
    },
  )
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as ChatMessageDto
}

export async function markChatNotificationsRead(ids?: string[]): Promise<void> {
  const res = await apiFetch('/api/v1/me/notifications/mark-read', {
    method: 'POST',
    body: JSON.stringify({ ids: ids ?? null }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export function hasChatSession(): boolean {
  return !!getSessionToken()
}
