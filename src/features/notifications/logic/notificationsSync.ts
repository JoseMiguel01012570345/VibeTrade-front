import { useAppStore } from '@features/auth/logic/useAppStore'
import { fetchChatNotifications } from '@features/chat/api/chatApi'
import { getSessionToken } from '@shared/services/http/sessionToken'
import type { NotificationItem } from '../Dtos/notificationItem'
import { mapServerNotification } from './mapServerNotification'

export async function fetchNotificationsFromServer(): Promise<NotificationItem[]> {
  if (!getSessionToken()) return []
  const list = await fetchChatNotifications()
  return list.map(mapServerNotification)
}

export async function syncChatNotificationsFromServer(): Promise<void> {
  try {
    const items = await fetchNotificationsFromServer()
    useAppStore.getState().setChatNotificationsFromServer(items)
  } catch {
    /* offline / 401 */
  }
}
