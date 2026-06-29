import { useAppStore } from "@features/auth/logic/useAppStore"
import { useMarketStore } from "@features/market/logic/store/useMarketStore"
import type { ChatMessageDto } from '@features/chat/Dtos/thread/chatApiTypes'
import type { ChatUnifiedMessagePayloadDto } from '@features/chat/Dtos/thread/chatMessagePayloadTypes'
import { incomingDtoSenderDisplayLabel } from '@features/chat/logic/participants/chatParticipantLabels'

export { getOpenChatThreadIdFromLocation } from './getOpenChatThreadIdFromLocation'

export function previewLineFromChatMessageDto(dto: ChatMessageDto): string {
  const p = dto.payload as ChatUnifiedMessagePayloadDto

  if (p.paymentFeeReceipt) return 'Recibo de pago'
  if (p.agreement?.title) return `Acuerdo: ${p.agreement.title}`
  if (p.systemText?.trim()) {
    const t = p.systemText.trim()
    return t.length > 220 ? `${t.slice(0, 220)}…` : t
  }

  if (p.images?.length) {
    const cap = p.caption?.trim()
    if (cap) return cap.length > 140 ? `${cap.slice(0, 140)}…` : cap
    return p.images.length > 1 ? `${p.images.length} fotos` : 'Foto'
  }

  if (p.documents?.length) {
    if (p.documents.length > 1) return `${p.documents.length} documentos`
    const name = p.documents[0]?.name?.trim()
    return name || 'Documento'
  }

  if (p.voiceUrl?.trim()) return 'Nota de voz'

  if (typeof p.text === 'string' && p.text.length > 0) {
    return p.text.length > 220 ? `${p.text.slice(0, 220)}…` : p.text
  }

  return 'Nuevo mensaje'
}

/** Nombre mostrable del remitente (tienda o `Comprador . …`) según el hilo hidratado en el store. */
export function incomingChatAuthorLabel(dto: ChatMessageDto): string {
  const thread = useMarketStore.getState().threads[dto.threadId]
  if (!thread) return "Chat"
  const { me, profileDisplayNames } = useAppStore.getState()
  return incomingDtoSenderDisplayLabel(
    dto,
    thread,
    me.id,
    me.name,
    profileDisplayNames,
  )
}
