import { useAppStore } from "@features/auth/logic/useAppStore"
import type { ChatMessageDto, ChatThreadDto, ChatThreadMemberDto } from '@features/chat/Dtos/thread/chatApiTypes';/** DisplayName y avatar del comprador desde `GET …/threads/:id` o bootstrap. */
export function mergeBuyerLabelFromThreadDto(
  dto: Pick<
    ChatThreadDto,
    'buyerUserId' | 'buyerDisplayName' | "buyerAvatarUrl"
  >,
): void {
  const raw = dto.buyerDisplayName?.trim()
  const av = dto.buyerAvatarUrl?.trim()
  if (!dto.buyerUserId) return
  const hasName = Boolean(raw)
  const hasAv = Boolean(av)
  if (!hasName && !hasAv) return
  useAppStore.setState((s) => ({
    ...(hasName
      ? { profileDisplayNames: { ...s.profileDisplayNames, [dto.buyerUserId]: raw! } }
      : {}),
    ...(hasAv
      ? { profileAvatarUrls: { ...s.profileAvatarUrls, [dto.buyerUserId]: av! } }
      : {}),
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

/** Nombres y avatares desde GET miembros del chat social (y fallback para burbujas). */
export function mergeSocialThreadMembersIntoProfileStore(
  members: readonly ChatThreadMemberDto[],
): void {
  if (!members.length) return
  useAppStore.setState((s) => {
    const profileDisplayNames = { ...s.profileDisplayNames }
    const profileAvatarUrls = { ...s.profileAvatarUrls }
    for (const m of members) {
      const id = m.userId?.trim()
      if (!id || id.length < 2) continue
      const dn = m.displayName?.trim()
      const av = m.avatarUrl?.trim()
      if (dn) profileDisplayNames[id] = dn
      if (av) profileAvatarUrls[id] = av
    }
    return { profileDisplayNames, profileAvatarUrls }
  })
}
