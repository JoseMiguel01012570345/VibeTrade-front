import { useQuery } from '@tanstack/react-query'
import { fetchLatestCarrierTelemetryForRouteSheet } from '../api/routeLogisticsApi'
import { queryKeys } from '@shared/lib/queryKeys'

type Params = {
  threadId: string
  agreementId: string
  routeSheetId: string
  enabled?: boolean
  refetchInterval?: number | false
}

export function useCarrierTelemetryQuery({
  threadId,
  agreementId,
  routeSheetId,
  enabled = true,
  refetchInterval = false,
}: Params) {
  const tid = threadId.trim()
  const aid = agreementId.trim()
  const rsid = routeSheetId.trim()
  return useQuery({
    queryKey: queryKeys.carrierTelemetry(tid, aid, rsid),
    queryFn: () =>
      fetchLatestCarrierTelemetryForRouteSheet({
        threadId: tid,
        agreementId: aid,
        routeSheetId: rsid,
      }),
    enabled: enabled && tid.length > 0 && aid.length > 0 && rsid.length > 0,
    staleTime: 5_000,
    refetchInterval,
  })
}
