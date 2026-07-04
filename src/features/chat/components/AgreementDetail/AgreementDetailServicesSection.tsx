import type { Dispatch, SetStateAction } from 'react'
import toast from 'react-hot-toast'
import {
  BadgeCheck,
  CreditCard,
  FileText,
  Pencil,
  XCircle,
} from 'lucide-react'
import { cn } from '@shared/lib/cn'
import type { TradeAgreement } from '@features/chat/Dtos/agreement/tradeAgreementTypes';
import { normalizeAgreementServices, serviceScopedExtraFields } from '@features/chat/logic/agreement/tradeAgreementTypes';import type { StoreCatalog } from '@features/market/logic/storeCatalogTypes'
import { findStoreService } from '@features/market/logic/storeCatalogTypes'
import { ServiceItemPreview } from '../modals/serviceConfig/ServiceItemPreview'
import type { AgreementServicePaymentApi } from '@features/chat/Dtos/agreement/agreementServiceEvidenceApiTypes';
import { useDecideServiceEvidenceMutation } from '@features/chat/hooks/useAgreementEvidenceMutations';
import {
  fetchPaymentGatewayConfigCached,
  fetchSavedCardsCached,
} from '@features/payments/hooks/usePaymentGatewayQueries';
import {
  agrDetailBlock,
  agrDetailH,
  agrDetailLabel,
  agrDetailRow,
  agrDetailSub,
  agrDetailValue,
} from '@shared/styles/modals/formModalStyles'
import {
  ExtraFieldClauseCards,
  fmtAgreementMoneyMinor,
} from './agreementDetailPresentation'
import type { EvidenceModalState, SellerPayoutModalState } from '@features/chat/Dtos/agreement/agreementDetailUiTypes';type Props = {
  agreement: TradeAgreement
  threadId: string
  isActingSeller: boolean
  catalog: StoreCatalog | undefined
  servicePays: AgreementServicePaymentApi[]
  servicePaysBusy: boolean
  setEvidenceModal: Dispatch<SetStateAction<EvidenceModalState>>
  setSellerPayoutModal: Dispatch<SetStateAction<SellerPayoutModalState>>
  refreshServicePays: () => Promise<unknown>
}

export function AgreementDetailServicesSection({
  agreement: a,
  threadId,
  isActingSeller,
  catalog,
  servicePays,
  servicePaysBusy,
  setEvidenceModal,
  setSellerPayoutModal,
  refreshServicePays,
}: Props) {
  const services = normalizeAgreementServices(a)
  const extraFields = serviceScopedExtraFields(a.extraFields)

  if (services.length === 0 && extraFields.length === 0) return null

  return (
    <div className={agrDetailBlock}>
      <div className={agrDetailH}>Servicios</div>
      {services.map((sv, i) => {
        const linked = findStoreService(catalog, sv.linkedStoreServiceId)
        const paysForService = servicePays.filter(
          (p) => p.serviceItemId === sv.id,
        )
        return (
          <div key={sv.id} className="mb-4 last:mb-0">
            <div className={agrDetailSub}>Servicio {i + 1}</div>
            {linked ? (
              <div className={cn(agrDetailRow, 'mt-2')}>
                <div className={agrDetailLabel}>Anclaje al catálogo</div>
                <div className={agrDetailValue}>
                  {linked.nombreServicio} · {linked.category}
                </div>
              </div>
            ) : null}
            <div className="mt-2">
              <ServiceItemPreview sv={sv} />
            </div>

            <div className="mt-3 rounded-xl border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                  Pagos y evidencia
                </div>
                {servicePaysBusy ? (
                  <div className="vt-muted text-[12px]">Cargando…</div>
                ) : null}
              </div>
              {paysForService.length === 0 ? (
                <div className="vt-muted mt-1 text-[13px]">
                  Aún no hay pagos registrados para este servicio.
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {paysForService.map((p) => (
                    <ServicePaymentRow
                      key={p.id}
                      payment={p}
                      threadId={threadId}
                      agreementId={a.id}
                      isActingSeller={isActingSeller}
                      setEvidenceModal={setEvidenceModal}
                      setSellerPayoutModal={setSellerPayoutModal}
                      refreshServicePays={refreshServicePays}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {extraFields.length ? (
        <div className="mt-6 border-t border-[color-mix(in_oklab,var(--border)_72%,transparent)] pt-4">
          <div className={agrDetailSub}>Otras cláusulas (servicio)</div>
          <ExtraFieldClauseCards fields={extraFields} />
        </div>
      ) : null}
    </div>
  )
}

function ServicePaymentRow({
  payment: p,
  threadId,
  agreementId,
  isActingSeller,
  setEvidenceModal,
  setSellerPayoutModal,
  refreshServicePays,
}: {
  payment: AgreementServicePaymentApi
  threadId: string
  agreementId: string
  isActingSeller: boolean
  setEvidenceModal: Dispatch<SetStateAction<EvidenceModalState>>
  setSellerPayoutModal: Dispatch<SetStateAction<SellerPayoutModalState>>
  refreshServicePays: () => Promise<unknown>
}) {
  const decideMutation = useDecideServiceEvidenceMutation(threadId, agreementId)
  const ev = p.evidence
  const evStatus = (ev?.status ?? '').trim().toLowerCase()
  const released = p.status === 'released'
  const canEditSeller =
    isActingSeller && !released && evStatus !== 'accepted'
  const canDecideBuyer = !isActingSeller && evStatus === 'submitted'
  const payoutDone = Boolean(p.sellerPayoutRecordedAtUtc)
  const canSellerPayout = isActingSeller && released && !payoutDone

  return (
    <div className="rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--surface)_96%,transparent)] p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-[13px] font-bold text-[var(--text)]">
          {released ? (
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck size={16} aria-hidden />
              Pago liberado
            </span>
          ) : (
            'Pago retenido'
          )}{' '}
          <span className="vt-muted">
            · mes {p.entryMonth} día {p.entryDay}
          </span>
        </div>
        <div className="font-mono text-[13px] font-bold">
          {fmtAgreementMoneyMinor(p.amountMinor, p.currencyLower)}
        </div>
      </div>

      <div className="vt-muted mt-1 text-[12px]">
        Evidencia:{' '}
        <b className="text-[var(--text)]">{evStatus || '—'}</b>
      </div>

      {payoutDone ? (
        <div className="vt-muted mt-1 space-y-0.5 text-[12px]">
          <div>
            Depósito registrado:{' '}
            <b className="text-[var(--text)]">
              {(p.sellerPayoutCardBrand ?? '').trim()} ••••{' '}
              {p.sellerPayoutCardLast4?.trim() ? p.sellerPayoutCardLast4 : '—'}
            </b>
          </div>
          {p.sellerPayoutTransferId?.trim() ? (
            <div className="font-mono text-[11px]">
              Transferencia: {p.sellerPayoutTransferId}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        {ev || canEditSeller ? (
          <button
            type="button"
            className="vt-btn vt-btn-sm inline-flex items-center gap-1.5"
            onClick={() =>
              setEvidenceModal({
                pay: p,
                text: ev?.text ?? '',
                attachments: ev?.attachments ?? [],
                busy: false,
                uploading: false,
              })
            }
          >
            {canEditSeller ? (
              <>
                <Pencil size={14} aria-hidden />
                {ev ? 'Editar evidencia' : 'Añadir evidencia'}
              </>
            ) : (
              <>
                <FileText size={14} aria-hidden />
                Ver evidencia
              </>
            )}
          </button>
        ) : null}

        {canSellerPayout ? (
          <div className="flex w-full min-w-[12rem] flex-col gap-1">
            <button
              type="button"
              className="vt-btn vt-btn-sm inline-flex items-center gap-1.5"
              onClick={() => openSellerPayoutModal(p, setSellerPayoutModal)}
            >
              <CreditCard size={14} aria-hidden />
              Liquidar depósito
            </button>
          </div>
        ) : null}

        {canDecideBuyer ? (
          <>
            <button
              type="button"
              className="vt-btn vt-btn-sm inline-flex items-center gap-1.5"
              onClick={() =>
                void decideMutation
                  .mutateAsync({
                    threadId,
                    agreementId,
                    paymentId: p.id,
                    decision: 'accept',
                  })
                  .then(() => {
                    toast.success('Evidencia aceptada.')
                    return refreshServicePays()
                  })
                  .catch((e) =>
                    toast.error(
                      (e as Error)?.message ?? 'No se pudo aceptar.',
                    ),
                  )
              }
            >
              <BadgeCheck size={14} aria-hidden />
              Aceptar
            </button>
            <button
              type="button"
              className="vt-btn vt-btn-sm vt-btn-ghost inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5"
              onClick={() =>
                void decideMutation
                  .mutateAsync({
                    threadId,
                    agreementId,
                    paymentId: p.id,
                    decision: 'reject',
                  })
                  .then(() => {
                    toast.success('Evidencia rechazada.')
                    return refreshServicePays()
                  })
                  .catch((e) =>
                    toast.error(
                      (e as Error)?.message ?? 'No se pudo rechazar.',
                    ),
                  )
              }
            >
              <XCircle size={14} aria-hidden />
              Rechazar
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

function openSellerPayoutModal(
  pay: AgreementServicePaymentApi,
  setSellerPayoutModal: Dispatch<SetStateAction<SellerPayoutModalState>>,
) {
  setSellerPayoutModal({
    pay,
    cards: [],
    selectedCardId: '',
    loadingCards: true,
    busy: false,
  })
  void (async () => {
    try {
      const cfg = await fetchPaymentGatewayConfigCached()
      if (!cfg.enabled) {
        setSellerPayoutModal(null)
        toast.error('Los pagos no están disponibles ahora.')
        return
      }
      const cards = await fetchSavedCardsCached()
      setSellerPayoutModal((m) =>
        m?.pay.id === pay.id
          ? {
              ...m,
              cards,
              selectedCardId: cards[0]?.id ?? '',
              loadingCards: false,
            }
          : m,
      )
    } catch (e) {
      setSellerPayoutModal(null)
      toast.error(
        (e as Error)?.message ?? 'No se pudieron cargar las tarjetas.',
      )
    }
  })()
}

