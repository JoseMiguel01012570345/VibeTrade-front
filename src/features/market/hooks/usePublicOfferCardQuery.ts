import { useQuery } from '@tanstack/react-query'
import { fetchPublicOfferCard } from '../api/marketPersistence'
import { queryKeys } from '@shared/lib/queryKeys'

export function usePublicOfferCardQuery(
  offerId: string | undefined,
  options?: { enabled?: boolean },
) {
  const id = offerId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.publicOfferCard(id),
    queryFn: () => fetchPublicOfferCard(id),
    enabled: (options?.enabled ?? true) && id.length > 0,
    staleTime: 30_000,
  })
}
