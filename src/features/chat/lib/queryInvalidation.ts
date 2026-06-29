import { queryClient } from '@shared/lib/queryClient'
import { notificationsQueryKey } from '@features/notifications/hooks/useNotifications'
import { storeDetailQueryKey } from '@features/market/api/fetchStoreDetail'
import { publicProfileQueryKey } from '@features/profile/hooks/usePublicProfile'

/** Invalida cachés de React Query tras eventos SignalR relevantes. */
export function invalidateQueriesForChatThread(threadId: string): void {
  void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
  void queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      (q.queryKey[0] === 'store-detail' || q.queryKey[0] === 'public-profile'),
  })
  void queryClient.invalidateQueries({
    queryKey: ['chat-thread', threadId.trim()],
  })
}

export function invalidateNotificationsQuery(): void {
  void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
}

export { storeDetailQueryKey, publicProfileQueryKey }
