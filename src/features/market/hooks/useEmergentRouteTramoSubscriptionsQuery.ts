import { useQuery } from '@tanstack/react-query'
import { fetchEmergentMyRouteTramoSubscriptions } from '../api/emergentCarrierSubscriptionApi'
import { queryKeys } from '@shared/lib/queryKeys'

export function useEmergentRouteTramoSubscriptionsQuery(
  emergentOfferId: string | undefined,
  options?: { enabled?: boolean },
) {
  const id = emergentOfferId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.emergentRouteTramoSubs(id),
    queryFn: () => fetchEmergentMyRouteTramoSubscriptions(id),
    enabled: (options?.enabled ?? true) && id.length > 0,
    staleTime: 20_000,
  })
}
