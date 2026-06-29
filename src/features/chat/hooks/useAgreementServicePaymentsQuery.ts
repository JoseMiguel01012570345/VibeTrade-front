import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listAgreementServicePayments } from '../api/agreementServiceEvidenceApi'
import { queryKeys } from '@shared/lib/queryKeys'

export function useAgreementServicePaymentsQuery(
  threadId: string,
  agreementId: string,
  options?: { enabled?: boolean },
) {
  const tid = threadId.trim()
  const aid = agreementId.trim()
  return useQuery({
    queryKey: queryKeys.agreementServicePayments(tid, aid),
    queryFn: () => listAgreementServicePayments(tid, aid),
    enabled: (options?.enabled ?? true) && tid.length > 0 && aid.length > 0,
    staleTime: 10_000,
  })
}

export function useInvalidateAgreementServicePayments() {
  const queryClient = useQueryClient()
  return (threadId: string, agreementId: string) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.agreementServicePayments(threadId, agreementId),
    })
  }
}
