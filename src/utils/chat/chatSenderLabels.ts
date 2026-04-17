import { useAppStore } from '../../app/store/useAppStore'
import type { ChatMessageDto, ChatThreadDto } from './chatApi'

/** DisplayName del comprador desde `GET …/threads/:id` (no depende de que haya enviado mensajes). */
export function mergeBuyerLabelFromThreadDto(
  dto: Pick<ChatThreadDto, 'buyerUserId' | 'buyerDisplayName'>,
): void {
  const raw = dto.buyerDisplayName?.trim()
  if (!raw || !dto.buyerUserId) return
  useAppStore.setState((s) => ({
    profileDisplayNames: { ...s.profileDisplayNames, [dto.buyerUserId]: raw },
  }))
}

/** Etiqueta de participante que envía el API (`UserAccounts.DisplayName` / nombre de tienda). */
export function mergeChatSenderLabelsIntoProfileStore(
  dtos: readonly ChatMessageDto[],
): void {
  const patch: Record<string, string> = {}
  for (const d of dtos) {
    const raw = d.senderDisplayLabel?.trim()
    if (raw) patch[d.senderUserId] = raw
  }
  if (Object.keys(patch).length === 0) return
  useAppStore.setState((s) => ({
    profileDisplayNames: { ...s.profileDisplayNames, ...patch },
  }))
}
