import type { RouteSheetPayload } from '../../pages/chat/domain/routeSheetTypes'
import { apiFetch } from '../http/apiClient'
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from '../http/apiErrorMessage'
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
  partyExitedUserId?: string | null
  partyExitedReason?: string | null
  partyExitedAtUtc?: string | null
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
  /** Backend: offer_comment, offer_like, qa_comment_like, route_tramo_subscribe, route_tramo_subscribe_accepted, route_tramo_subscribe_rejected, peer_party_exited; ausente en avisos de chat por hilo. */
  kind?: string | null
  /** JSON con routeSheetId, stopId, carrierUserId (camelCase). */
  metaJson?: string | null
}

/** `Error.message` cuando el servidor rechaza abrir chat como comprador en tu propia oferta. */
export const CHAT_CANNOT_MESSAGE_SELF = 'CHAT_CANNOT_MESSAGE_SELF'

export async function createOrGetChatThread(
  offerId: string,
  purchaseIntent: boolean = true,
  forceNew: boolean = false,
): Promise<ChatThreadDto> {
  const res = await apiFetch('/api/v1/chat/threads', {
    method: 'POST',
    body: JSON.stringify({ offerId, purchaseIntent, forceNew }),
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

/** Avisa a la contraparte por SignalR (grupos user:*) de que quien llama salió del chat (lista / sin acuerdo). */
export async function postNotifyParticipantLeft(threadId: string): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/notify-participant-left`,
    { method: 'POST' },
  );
  if (!res.ok && res.status !== 404) {
    const t = await res.text().catch(() => '');
    throw new Error(t || `HTTP ${res.status}`);
  }
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

/** Comprador/vendedor con acuerdo aceptado: expulsa a quien sale del hilo; el resto sigue pudiendo usar el chat. */
export async function postPartySoftLeaveChatThread(
  threadId: string,
  reason: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/party-soft-leave`,
    {
      method: 'POST',
      body: JSON.stringify({ reason: reason.trim() }),
    },
  )
  if (!res.ok) {
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

export async function fetchThreadRouteSheets(threadId: string): Promise<RouteSheetPayload[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets`,
    { method: 'GET', cache: 'no-store' },
  )
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as RouteSheetPayload[]
}

/** Ítem de GET <c>threads/{id}/route-tramo-subscriptions</c> (camelCase). */
export type RouteTramoSubscriptionItemApi = {
  routeSheetId: string
  stopId: string
  orden: number
  carrierUserId: string
  displayName: string
  phone: string
  trustScore: number
  storeServiceId?: string | null
  transportServiceLabel: string
  status: string
  origenLine: string
  destinoLine: string
  createdAtUnixMs: number
  carrierServiceStoreId?: string | null
}

/** Suscripciones a tramos persistidas en servidor (hojas publicadas del hilo). */
export async function fetchThreadRouteTramoSubscriptions(
  threadId: string,
): Promise<RouteTramoSubscriptionItemApi[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions`,
    { method: 'GET', cache: 'no-store' },
  )
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as RouteTramoSubscriptionItemApi[]
}

export type CarrierExpelledBySellerApiResult = {
  withdrawnRowCount: number
  /** En la demo: penalización a la confianza de la tienda al expulsar a un transportista confirmado. */
  applyStoreTrustPenalty: boolean
  storeTrustScoreAfter?: number | null
}

export async function postSellerExpelCarrier(
  threadId: string,
  body: { carrierUserId: string; reason: string },
): Promise<CarrierExpelledBySellerApiResult> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions/seller-expel-carrier`,
    {
      method: 'POST',
      body: JSON.stringify({
        carrierUserId: body.carrierUserId,
        reason: body.reason,
      }),
    },
  )
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `HTTP ${res.status}`)
  }
  return (await res.json()) as CarrierExpelledBySellerApiResult
}

export type CarrierWithdrawFromThreadApiResult = {
  withdrawnRowCount: number
  applyTrustPenalty: boolean
  /** Trust persistido en servidor tras penalización (si aplica). */
  trustScoreAfterPenalty?: number | null
}

/** Transportista: abandona el hilo y des-suscribe tramos (no borra el hilo para comprador/vendedor). */
export async function postCarrierWithdrawFromThread(
  threadId: string,
): Promise<CarrierWithdrawFromThreadApiResult> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions/carrier-withdraw`,
    { method: 'POST' },
  )
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as CarrierWithdrawFromThreadApiResult
}

export async function postAcceptRouteTramoSubscriptions(
  threadId: string,
  body: { routeSheetId: string; carrierUserId: string; stopId?: string },
): Promise<{ acceptedCount: number }> {
  const sid = body.stopId?.trim()
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions/accept`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeSheetId: body.routeSheetId,
        carrierUserId: body.carrierUserId,
        ...(sid ? { stopId: sid } : {}),
      }),
    },
  )
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()) || `HTTP ${res.status}`,
    )
  }
  return (await res.json()) as { acceptedCount: number }
}

export async function postRejectRouteTramoSubscriptions(
  threadId: string,
  body: { routeSheetId: string; carrierUserId: string; stopId?: string },
): Promise<{ rejectedCount: number }> {
  const sid = body.stopId?.trim()
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeSheetId: body.routeSheetId,
        carrierUserId: body.carrierUserId,
        ...(sid ? { stopId: sid } : {}),
      }),
    },
  )
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
  return (await res.json()) as { rejectedCount: number }
}

export async function putThreadRouteSheet(threadId: string, sheet: RouteSheetPayload): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets/${encodeURIComponent(sheet.id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheet),
    },
  )
  if (!res.ok) throw new Error(await res.text())
}

export async function deleteThreadRouteSheet(threadId: string, routeSheetId: string): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets/${encodeURIComponent(routeSheetId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok && res.status !== 404) throw new Error(await res.text())
}

/** Transportista: acuse de edición de hoja (aceptar / rechazar). */
export async function postRouteSheetEditCarrierResponse(
  threadId: string,
  routeSheetId: string,
  accept: boolean,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets/${encodeURIComponent(routeSheetId)}/edit-carrier-response`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    },
  )
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `HTTP ${res.status}`)
  }
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

/** Persiste vínculo acuerdo ↔ hoja de ruta (seller). `routeSheetId` null = desvincular. */
export async function patchThreadTradeAgreementRouteLink(
  threadId: string,
  agreementId: string,
  routeSheetId: string | null,
): Promise<TradeAgreementApiDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements/${encodeURIComponent(agreementId)}/route-link`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeSheetId }),
    },
  )
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as TradeAgreementApiDto
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

export async function fetchChatNotifications(options?: {
  /** ISO 8601; inicio del rango (inclusive). */
  from?: string
  /** ISO 8601; fin del rango (inclusive). */
  to?: string
}): Promise<ChatNotificationDto[]> {
  const q = new URLSearchParams()
  if (options?.from?.trim()) q.set('from', options.from.trim())
  if (options?.to?.trim()) q.set('to', options.to.trim())
  const qs = q.toString()
  const url =
    qs.length > 0 ? `/api/v1/me/notifications?${qs}` : '/api/v1/me/notifications'
  const res = await apiFetch(url, { method: 'GET' })
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
