import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchStoreDetail, storeDetailQueryKey } from '../api/fetchStoreDetail'

export function useStoreDetail(
  storeId: string | undefined,
  viewerUserId: string,
  viewerRole?: string | null,
) {
  const enabled = Boolean(storeId?.trim() && viewerUserId.trim())

  return useQuery({
    queryKey: storeId ? storeDetailQueryKey(storeId, viewerUserId) : ['store-detail', 'idle'],
    queryFn: () => fetchStoreDetail(storeId!.trim(), { userId: viewerUserId, viewerRole }),
    enabled,
    staleTime: 30_000,
  })
}

export function useStoreDetailRefetch(storeId: string | undefined, viewerUserId: string) {
  const q = useStoreDetail(storeId, viewerUserId)
  return useCallback(() => q.refetch(), [q])
}
