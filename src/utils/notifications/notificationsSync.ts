import { useAppStore } from '../../app/store/useAppStore'
import { fetchChatNotifications } from '../chat/chatApi'
import { getSessionToken } from '../http/sessionToken'

type OfferNotifKind = 'offer_comment' | 'offer_like' | 'qa_comment_like'

function mapOfferNotificationKind(k: string | null | undefined): OfferNotifKind {
  if (k === 'offer_like') return 'offer_like'
  if (k === 'qa_comment_like') return 'qa_comment_like'
  return 'offer_comment'
}

export async function syncChatNotificationsFromServer(): Promise<void> {
  if (!getSessionToken()) return
  try {
    const list = await fetchChatNotifications()
    const items = list.map((n) => {
      const isOfferOnly = Boolean(n.offerId && !n.threadId)
      const kind = isOfferOnly
        ? mapOfferNotificationKind(n.kind)
        : ('chat_message' as const)
      return {
        id: n.id,
        kind,
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
