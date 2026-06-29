import type { Message, Thread } from '@features/market/model/store/useMarketStore'

export const PREMATURE_EXIT_TOOLTIP =
  'Este chat se resalta porque registraste una salida con un acuerdo ya aceptado; la plataforma puede revisar el caso.'

export function threadLastActivity(th: Thread): number {
  let t = 0
  for (const m of th.messages) {
    if ('at' in m) t = Math.max(t, m.at)
  }
  return t
}

export function lastMessage(th: Thread): Message | undefined {
  let best: Message | undefined
  let bestAt = -1
  for (const m of th.messages) {
    if ('at' in m && m.at > bestAt) {
      bestAt = m.at
      best = m
    }
  }
  return best
}

export function fmtChatListShortTime(ts: number) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function normalizeChatListFilterText(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}
