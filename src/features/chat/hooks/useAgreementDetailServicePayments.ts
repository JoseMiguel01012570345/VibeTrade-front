import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useMarketStore } from '@features/market/model/store/useMarketStore'
import {
  listAgreementServicePayments,
  type AgreementServicePaymentApi,
  type ServiceEvidenceAttachmentApi,
} from '@features/chat/api/agreementServiceEvidenceApi'
import type { SavedCard } from '@features/payments'

export type EvidenceModalState = {
  pay: AgreementServicePaymentApi
  text: string
  attachments: ServiceEvidenceAttachmentApi[]
  busy: boolean
  uploading: boolean
} | null

export type SellerPayoutModalState = {
  pay: AgreementServicePaymentApi
  cards: SavedCard[]
  selectedCardId: string
  loadingCards: boolean
  busy: boolean
} | null

export function useAgreementDetailServicePayments(
  threadId: string,
  agreementId: string,
) {
  const [servicePays, setServicePays] = useState<AgreementServicePaymentApi[]>(
    [],
  )
  const [servicePaysBusy, setServicePaysBusy] = useState(false)
  const [evidenceModal, setEvidenceModal] = useState<EvidenceModalState>(null)
  const [sellerPayoutModal, setSellerPayoutModal] =
    useState<SellerPayoutModalState>(null)

  const lastMsg = useMarketStore((s) => {
    const msgs = s.threads[threadId]?.messages
    return msgs && msgs.length > 0 ? msgs[msgs.length - 1] : undefined
  })
  const lastEvidenceRefreshMsgIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setServicePaysBusy(true)
    void (async () => {
      try {
        const list = await listAgreementServicePayments(threadId, agreementId)
        if (!cancelled) setServicePays(list)
      } catch (e) {
        if (!cancelled)
          toast.error(
            (e as Error)?.message ??
              'No se pudieron cargar pagos de servicios.',
          )
      } finally {
        if (!cancelled) setServicePaysBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [threadId, agreementId])

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
    void (async () => {
      try {
        const list = await listAgreementServicePayments(threadId, agreementId)
        setServicePays(list)
      } catch {
        /* no-op */
      }
    })()
  }, [lastMsg, threadId, agreementId])

  const refreshServicePays = async () => {
    const list = await listAgreementServicePayments(threadId, agreementId)
    setServicePays(list)
    return list
  }

  return {
    servicePays,
    servicePaysBusy,
    evidenceModal,
    setEvidenceModal,
    sellerPayoutModal,
    setSellerPayoutModal,
    refreshServicePays,
    lastMsg,
  }
}
