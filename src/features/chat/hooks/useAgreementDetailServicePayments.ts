import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useMarketStore } from '@features/market/logic/store/useMarketStore'
import type {
  AgreementServicePaymentApi,
} from '@features/chat/Dtos/agreement/agreementServiceEvidenceApiTypes'
import type {
  EvidenceModalState,
  SellerPayoutModalState,
} from '@features/chat/Dtos/agreement/agreementDetailUiTypes'
import {
  useAgreementServicePaymentsQuery,
  useInvalidateAgreementServicePayments,
} from './useAgreementServicePaymentsQuery'

export function useAgreementDetailServicePayments(
  threadId: string,
  agreementId: string,
) {
  const paymentsQuery = useAgreementServicePaymentsQuery(threadId, agreementId)
  const invalidate = useInvalidateAgreementServicePayments()
  const [evidenceModal, setEvidenceModal] = useState<EvidenceModalState>(null)
  const [sellerPayoutModal, setSellerPayoutModal] =
    useState<SellerPayoutModalState>(null)

  const lastMsg = useMarketStore((s) => {
    const msgs = s.threads[threadId]?.messages
    return msgs && msgs.length > 0 ? msgs[msgs.length - 1] : undefined
  })
  const lastEvidenceRefreshMsgIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!lastMsg) return
    if (lastEvidenceRefreshMsgIdRef.current === lastMsg.id) return
    if (lastMsg.from !== 'system') return
    if (lastMsg.type === 'payment_fee_receipt') {
      if (lastMsg.receipt.agreementId.trim() !== agreementId.trim()) return
    } else if (lastMsg.type === 'text') {
      const t = (lastMsg.text ?? '').toLowerCase()
      if (!t.includes('evidencia') && !t.includes('depósito')) return
    } else {
      return
    }
    lastEvidenceRefreshMsgIdRef.current = lastMsg.id
    invalidate(threadId, agreementId)
  }, [lastMsg, threadId, agreementId, invalidate])

  useEffect(() => {
    if (paymentsQuery.isError) {
      toast.error(
        (paymentsQuery.error as Error)?.message ??
          'No se pudieron cargar pagos de servicios.',
      )
    }
  }, [paymentsQuery.isError, paymentsQuery.error])

  const refreshServicePays = async () => {
    const result = await paymentsQuery.refetch()
    return result.data ?? []
  }

  return {
    servicePays: (paymentsQuery.data ?? []) as AgreementServicePaymentApi[],
    servicePaysBusy: paymentsQuery.isLoading || paymentsQuery.isFetching,
    evidenceModal,
    setEvidenceModal,
    sellerPayoutModal,
    setSellerPayoutModal,
    refreshServicePays,
    lastMsg,
  }
}
