import { useAppStore } from '../../app/store/useAppStore'
import { fetchChatNotifications } from '../chat/chatApi'
import { getSessionToken } from '../http/sessionToken'

export async function syncChatNotificationsFromServer(): Promise<void> {
  if (!getSessionToken()) return
  try {
    const list = await fetchChatNotifications()
    const items = list.map((n) => ({
      id: n.id,
      kind: 'chat_message' as const,
      title: `${n.authorLabel} · confianza ${n.authorTrustScore}`,
      body: n.messagePreview,
      createdAt: Date.parse(n.createdAtUtc),
      read: n.readAtUtc != null,
      threadId: n.threadId,
      trustScore: n.authorTrustScore,
    }))
    useAppStore.getState().setChatNotificationsFromServer(items)
  } catch {
    /* offline / 401 */
  }
}
