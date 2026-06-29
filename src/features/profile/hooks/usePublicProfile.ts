import { useQuery } from '@tanstack/react-query'
import { fetchPublicProfile } from '@features/auth/api/fetchPublicProfile'

export function publicProfileQueryKey(userId: string) {
  return ['public-profile', userId] as const
}

export function usePublicProfile(userId: string | undefined, enabled = true) {
  const id = userId?.trim() ?? ''
  return useQuery({
    queryKey: publicProfileQueryKey(id),
    queryFn: () => fetchPublicProfile(id),
    enabled: enabled && id.length > 0,
    staleTime: 30_000,
  })
}
