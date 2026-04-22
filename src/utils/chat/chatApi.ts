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
  /** DisplayName del comprador (p. ej. título del chat para el vendedor). */
  buyerDisplayName?: string | null
  /** Foto de perfil del comprador (`/api/v1/media/…`; usar componente protegido en UI). */
  buyerAvatarUrl?: string | null
}

/** Aligned with backend <see cref="VibeTrade.Backend.Data.ChatMessageStatus" /> (camelCase JSON). */
export type ChatMessageStatusApi =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'error'

/** Coincide con el JSON de payload del backend (camelCase). */
/** Respuesta GET/POST/PATCH acuerdos (camelCase API). */
export type TradeAgreementApiDto = {
  id: string
  threadId: string
  title: string
  issuedAt: number
  issuedByStoreId: string
  issuerLabel: string
  status: 'pending_buyer' | 'accepted' | 'rejected' | 'deleted'
  deletedAt?: number | null
  respondedAt?: number | null
  sellerEditBlockedUntilBuyerResponse?: boolean | null
  includeMerchandise: boolean
  includeService: boolean
  merchandise: Record<string, unknown>[]
  merchandiseMeta?: Record<string, unknown> | null
  services: Record<string, unknown>[]
  routeSheetId?: string | null
  routeSheetUrl?: string | null
}

export type ChatMessagePayloadDto = Record<string, unknown> & {
  type?: string
  text?: string
  agreementId?: string
  title?: string
  status?: string
  offerQaId?: string
  replyQuotes?: Array<{
    messageId: string
    author: string
    preview: string
    atUtc: string
  }>
  replyToIds?: string[]
  url?: string
  seconds?: number
  images?: { url: string }[]
  caption?: string
  embeddedAudio?: { url: string; seconds: number }
  name?: string
  size?: string
  kind?: string
  documents?: { name: string; size: string; kind: string; url?: string }[]
}

export type ChatMessageDto = {
  id: string
  threadId: string
  senderUserId: string
  payload: ChatMessagePayloadDto
  status: ChatMessageStatusApi
  createdAtUtc: string
  updatedAtUtc: string | null
  /** Nombre mostrable del remitente (API: comprador = DisplayName, vendedor = tienda). */
  senderDisplayLabel?: string | null
}

export type ChatThreadSummaryDto = {
  id: string
  offerId: string
  storeId: string
  createdAtUtc: string
  lastMessageAtUtc: string | null
  lastPreview: string | null
  purchaseMode: boolean
  buyerUserId: string
  sellerUserId: string
  buyerDisplayName?: string | null
  buyerAvatarUrl?: string | null
}

export type ChatNotificationDto = {
  id: string
  threadId: string | null
  messageId: string | null
  /** Presente cuando el aviso es por comentario en ficha (enlace a `/offer/:id`). */
  offerId: string | null
  messagePreview: string
  /** Nombre tienda o nombre del comprador (según emisor). */
  authorLabel: string
  authorTrustScore: number
  senderUserId: string
  createdAtUtc: string
  readAtUtc: string | null
  /** Backend: offer_comment, offer_like, qa_comment_like; ausente en avisos de chat por hilo. */
  kind?: string | null
}

/** `Error.message` cuando el servidor rechaza abrir chat como comprador en tu propia oferta. */
export const CHAT_CANNOT_MESSAGE_SELF = 'CHAT_CANNOT_MESSAGE_SELF'

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
    if (res.status === 400) {
      try {
        const j = JSON.parse(t) as { error?: string }
        if (j.error === 'cannot_message_self') {
          throw new Error(CHAT_CANNOT_MESSAGE_SELF)
        }
      } catch (e) {
        if (e instanceof Error && e.message === CHAT_CANNOT_MESSAGE_SELF) throw e
      }
    }
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
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as ChatMessageDto[]
}

export async function fetchThreadTradeAgreements(
  threadId: string,
): Promise<TradeAgreementApiDto[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements`,
    { method: 'GET', cache: 'no-store' },
  )
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as TradeAgreementApiDto[]
}

export async function postThreadTradeAgreement(
  threadId: string,
  body: Record<string, unknown>,
): Promise<TradeAgreementApiDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as TradeAgreementApiDto
}

export async function patchThreadTradeAgreement(
  threadId: string,
  agreementId: string,
  body: Record<string, unknown>,
): Promise<TradeAgreementApiDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements/${encodeURIComponent(agreementId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as TradeAgreementApiDto
}

export async function postThreadTradeAgreementRespond(
  threadId: string,
  agreementId: string,
  accept: boolean,
): Promise<TradeAgreementApiDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements/${encodeURIComponent(agreementId)}/respond`,
    { method: 'POST', body: JSON.stringify({ accept }) },
  )
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as TradeAgreementApiDto
}

export async function deleteThreadTradeAgreement(
  threadId: string,
  agreementId: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements/${encodeURIComponent(agreementId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok && res.status !== 404) throw new Error(await res.text())
}

export async function postChatMessage(
  threadId: string,
  body: Record<string, unknown>,
): Promise<ChatMessageDto> {
  const res = await apiFetch(`/api/v1/chat/threads/${encodeURIComponent(threadId)}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as ChatMessageDto
}

export async function postChatTextMessage(
  threadId: string,
  text: string,
  options?: { replyToIds?: string[] },
): Promise<ChatMessageDto> {
  const payload: Record<string, unknown> = { type: 'text', text }
  if (options?.replyToIds?.length) payload.replyToIds = options.replyToIds
  return postChatMessage(threadId, payload)
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
