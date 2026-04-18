import { useAppStore } from '../../app/store/useAppStore'
import { fetchChatNotifications } from '../chat/chatApi'
import { getSessionToken } from '../http/sessionToken'

export async function syncChatNotificationsFromServer(): Promise<void> {
  if (!getSessionToken()) return
  try {
    const list = await fetchChatNotifications()
    const items = list.map((n) => {
      const isOfferOnly = n.offerId && !n.threadId
      return {
        id: n.id,
        kind: isOfferOnly ? ('offer_comment' as const) : ('chat_message' as const),
        title: `${n.authorLabel} · confianza ${n.authorTrustScore}`,
        body: n.messagePreview,
        createdAt: Date.parse(n.createdAtUtc),
        read: n.readAtUtc != null,
        ...(n.threadId ? { threadId: n.threadId } : {}),
        ...(n.offerId ? { offerId: n.offerId } : {}),
        trustScore: n.authorTrustScore,
      }
    })
    useAppStore.getState().setChatNotificationsFromServer(items)
  } catch {
    /* offline / 401 */
  }
}
