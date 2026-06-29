import { useMemo } from 'react'
import type { ChatListRow } from '@features/chat/Dtos/thread/chatListTypes'
import { useMarketStore } from '@features/market/logic/store/useMarketStore'
import { useAppStore } from '@features/auth/logic/useAppStore'
import { chatThreadHeaderTitle } from '@features/chat/logic/participants/chatParticipantLabels'
import { messagePreviewLine } from '@features/chat/logic/messages/chatAttachments'
import {
  lastMessage,
  normalizeChatListFilterText,
  threadLastActivity,
} from '@features/chat/logic/thread/chatListUtils'

export function useChatListRows(nameFilterQuery: string) {
  const me = useAppStore((s) => s.me)
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames)
  const threads = useMarketStore((s) => s.threads)
  const offers = useMarketStore((s) => s.offers)

  const rows = useMemo(() => {
    const list = Object.values(threads)
    list.sort((a, b) => threadLastActivity(b) - threadLastActivity(a))
    const q = nameFilterQuery.trim().toLowerCase()
    const needle = normalizeChatListFilterText(q)
    return list
      .map((th): ChatListRow => {
        const offer = offers[th.offerId]
        const last = lastMessage(th)
        const offerTitle = offer?.title ?? 'Oferta'
        const listTitle = chatThreadHeaderTitle(
          th,
          me,
          profileDisplayNames,
          offerTitle,
        )
        return {
          th,
          offerTitle,
          preview: last ? messagePreviewLine(last) : 'Sin mensajes',
          at: threadLastActivity(th),
          listTitle,
        }
      })
      .filter((row) => {
        if (!needle) return true
        const hay = normalizeChatListFilterText(
          `${row.listTitle} ${row.offerTitle} ${(row.th.store.name ?? '').trim()}`,
        )
        return hay.includes(needle)
      })
  }, [threads, offers, nameFilterQuery, me, profileDisplayNames])

  const chatListCount = Object.keys(threads).length
  const hasThreads = chatListCount > 0

  return { rows, chatListCount, hasThreads }
}
