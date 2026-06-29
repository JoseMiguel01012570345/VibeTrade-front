import { useQuery } from '@tanstack/react-query'
import { fetchLinkPreview } from '../api/chatApi'
import { queryKeys } from '@shared/lib/queryKeys'

export function useLinkPreview(url: string | undefined) {
  const u = url?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.linkPreview(u),
    queryFn: () => fetchLinkPreview(u),
    enabled: u.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  })
}
