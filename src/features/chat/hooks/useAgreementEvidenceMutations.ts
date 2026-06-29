import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  decideMerchandiseEvidence,
  upsertMerchandiseEvidence,
} from '../api/agreementMerchandiseEvidenceApi'
import {
  decideServiceEvidence,
  upsertServiceEvidence,
} from '../api/agreementServiceEvidenceApi'
import { useInvalidateAgreementMerchandisePayments } from './useAgreementMerchandisePaymentsQuery'
import { useInvalidateAgreementServicePayments } from './useAgreementServicePaymentsQuery'

export function useDecideServiceEvidenceMutation(
  threadId: string,
  agreementId: string,
) {
  const invalidate = useInvalidateAgreementServicePayments()
  return useMutation({
    mutationFn: decideServiceEvidence,
    onSuccess: () => invalidate(threadId, agreementId),
  })
}

export function useUpsertServiceEvidenceMutation(
  threadId: string,
  agreementId: string,
) {
  const invalidate = useInvalidateAgreementServicePayments()
  return useMutation({
    mutationFn: upsertServiceEvidence,
    onSuccess: () => invalidate(threadId, agreementId),
  })
}

export function useDecideMerchandiseEvidenceMutation(
  threadId: string,
  agreementId: string,
) {
  const invalidate = useInvalidateAgreementMerchandisePayments()
  return useMutation({
    mutationFn: decideMerchandiseEvidence,
    onSuccess: () => invalidate(threadId, agreementId),
  })
}

export function useUpsertMerchandiseEvidenceMutation(
  threadId: string,
  agreementId: string,
) {
  const invalidate = useInvalidateAgreementMerchandisePayments()
  return useMutation({
    mutationFn: upsertMerchandiseEvidence,
    onSuccess: () => invalidate(threadId, agreementId),
  })
}

export function useInvalidateAgreementDeliveriesForThread() {
  const queryClient = useQueryClient()
  return (threadId: string) => {
    const tid = threadId.trim()
    void queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === 'agreement-route-deliveries' &&
        q.queryKey[1] === tid,
    })
  }
}
