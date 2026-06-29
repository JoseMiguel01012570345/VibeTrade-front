import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAgreementRouteDeliveries } from '../api/routeLogisticsApi'
import { queryKeys } from '@shared/lib/queryKeys'

export function useAgreementRouteDeliveriesQuery(
  threadId: string,
  agreementId: string,
  options?: { enabled?: boolean },
) {
  const tid = threadId.trim()
  const aid = agreementId.trim()
  return useQuery({
    queryKey: queryKeys.agreementRouteDeliveries(tid, aid),
    queryFn: () => fetchAgreementRouteDeliveries(tid, aid),
    enabled: (options?.enabled ?? true) && tid.length > 0 && aid.length > 0,
    staleTime: 15_000,
  })
}

export function useInvalidateAgreementRouteDeliveries() {
  const queryClient = useQueryClient()
  return (threadId: string, agreementId: string) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.agreementRouteDeliveries(threadId, agreementId),
    })
  }
}
