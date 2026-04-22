import { useAppStore } from '../../app/store/useAppStore'
import { useMarketStore } from '../../app/store/useMarketStore'
import type { ChatMessageDto } from './chatApi'
import { incomingDtoSenderDisplayLabel } from './chatParticipantLabels'

export { getOpenChatThreadIdFromLocation } from './getOpenChatThreadIdFromLocation'

export function previewLineFromChatMessageDto(dto: ChatMessageDto): string {
  const p = dto.payload as Record<string, unknown>
  const type = p?.type as string | undefined
  switch (type) {
    case 'text':
      return (
        (typeof p.text === 'string'
          ? p.text.length > 220
            ? `${p.text.slice(0, 220)}…`
            : p.text
          : '') || 'Mensaje'
      )
    case 'audio':
      return 'Nota de voz'
    case 'image': {
      const cap =
        typeof p.caption === 'string' && p.caption.trim()
          ? p.caption.trim().slice(0, 140)
          : ''
      if (cap) return cap
      const imgs = p.images as unknown
      const n = Array.isArray(imgs) ? imgs.length : 0
      return n > 1 ? `${n} fotos` : 'Foto'
    }
    case 'doc':
      return typeof p.name === 'string' && p.name.length ? p.name : 'Documento'
    case 'docs': {
      const docs = p.documents as unknown
      if (!Array.isArray(docs) || docs.length === 0) return 'Documentos'
      if (docs.length > 1) return `${docs.length} documentos`
      const d0 = docs[0] as { name?: string } | undefined
      return typeof d0?.name === 'string' && d0.name.length ? d0.name : 'Documento'
    }
    default:
      return 'Nuevo mensaje'
  }
}

/** Nombre mostrable del remitente (tienda o `Comprador . …`) según el hilo hidratado en el store. */
export function incomingChatAuthorLabel(dto: ChatMessageDto): string {
  const thread = useMarketStore.getState().threads[dto.threadId]
  if (!thread) return 'Chat'
  const { me, profileDisplayNames } = useAppStore.getState()
  return incomingDtoSenderDisplayLabel(
    dto,
    thread,
    me.id,
    me.name,
    profileDisplayNames,
  )
}
