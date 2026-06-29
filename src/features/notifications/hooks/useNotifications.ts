import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@features/auth/store/useAppStore'
import {
  fetchNotificationsFromServer,
  syncChatNotificationsFromServer,
} from '../api/notificationsApi'

export const notificationsQueryKey = ['notifications'] as const

export function useNotifications() {
  const queryClient = useQueryClient()
  const storeItems = useAppStore((s) => s.notifications)
  const markAllReadStore = useAppStore((s) => s.markAllRead)

  const query = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: fetchNotificationsFromServer,
    staleTime: 30_000,
    retry: 1,
    enabled: false,
  })

  const syncMutation = useMutation({
    mutationFn: syncChatNotificationsFromServer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
    },
  })

  const items = storeItems
  const unread = useMemo(() => items.filter((x) => !x.read).length, [items])

  return {
    items,
    unread,
    markAllRead: markAllReadStore,
    syncFromServer: () => syncMutation.mutateAsync(),
    isSyncing: syncMutation.isPending,
    refetch: query.refetch,
  }
}
