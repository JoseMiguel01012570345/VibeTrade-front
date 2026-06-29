import { useQuery } from '@tanstack/react-query'
import { fetchPublishedTransportServicesForUser } from '../api/publishedTransportServicesApi'
import { queryKeys } from '@shared/lib/queryKeys'

export function usePublishedTransportServicesQuery(
  userId: string | undefined,
  enabled = true,
) {
  const id = userId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.publishedTransportServices(id),
    queryFn: () => fetchPublishedTransportServicesForUser(id),
    enabled: enabled && id.length > 0,
    staleTime: 60_000,
  })
}
