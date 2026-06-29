import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listAgreementMerchandisePayments } from '../api/agreementMerchandiseEvidenceApi'
import { queryKeys } from '@shared/lib/queryKeys'

export function useAgreementMerchandisePaymentsQuery(
  threadId: string,
  agreementId: string,
  options?: { enabled?: boolean },
) {
  const tid = threadId.trim()
  const aid = agreementId.trim()
  return useQuery({
    queryKey: queryKeys.agreementMerchandisePayments(tid, aid),
    queryFn: () => listAgreementMerchandisePayments(tid, aid),
    enabled: (options?.enabled ?? true) && tid.length > 0 && aid.length > 0,
    staleTime: 10_000,
  })
}

export function useInvalidateAgreementMerchandisePayments() {
  const queryClient = useQueryClient()
  return (threadId: string, agreementId: string) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.agreementMerchandisePayments(threadId, agreementId),
    })
  }
}
