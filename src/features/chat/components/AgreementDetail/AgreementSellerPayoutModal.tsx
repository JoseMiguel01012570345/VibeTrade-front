import type { Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, BadgeCheck, CreditCard, XCircle } from 'lucide-react'
import { CeSpinner } from '@shared/components/ui/CeSpinner'
import { useNavigate } from 'react-router-dom'
import { VtSelect } from '@shared/components/ui/VtSelect'
import { recordSellerServicePayout } from '@features/chat/api/agreementServiceEvidenceApi'
import { PAYMENT_FEE_POLICY_URL } from '@features/payments/logic/paymentFeePolicyLinks'
import { fmtAgreementMoneyMinor } from './agreementDetailPresentation'
import type { SellerPayoutModalState } from '@features/chat/Dtos/agreement/agreementDetailUiTypes';type Props = {
  threadId: string
  agreementId: string
  modal: NonNullable<SellerPayoutModalState>
  onClose: () => void
  onUpdate: Dispatch<SetStateAction<SellerPayoutModalState>>
  onRefresh: () => Promise<unknown>
}

export function AgreementSellerPayoutModal({
  threadId,
  agreementId,
  modal,
  onClose,
  onUpdate,
  onRefresh,
}: Props) {
  const nav = useNavigate()

  return (
    <div
      className="fixed inset-0 z-[82] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div className="text-[13px] font-black text-[var(--text)]">
              Depósito del pago liberado
            </div>
            <div className="vt-muted mt-0.5 text-[12px]">
              Mes {modal.pay.entryMonth} día {modal.pay.entryDay} ·{' '}
              {fmtAgreementMoneyMinor(
                modal.pay.amountMinor,
                modal.pay.currencyLower,
              )}
            </div>
          </div>
          <button
            type="button"
            className="vt-btn vt-btn-ghost inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-2"
            onClick={onClose}
            disabled={modal.busy}
          >
            <XCircle size={16} aria-hidden /> Cerrar
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="text-[13px] leading-relaxed text-[var(--text)]">
            Confirmar ejecuta una{' '}
            <span className="font-mono text-[11px]">Transfer</span> de liquidación
            desde el balance de la plataforma hacia tu cuenta de pago configurada
            (
            <span className="font-mono text-[11px]">acct_…</span>
            ). La tarjeta queda como referencia; el uso del saldo Connect lo define
            la pasarela.
          </p>

          <div
            className="mt-3 rounded-lg border-l-4 border-l-amber-600 bg-[color-mix(in_oklab,#d97706_12%,var(--surface))] px-3 py-2.5 text-[12px] leading-snug text-[var(--text)] ring-1 ring-[color-mix(in_oklab,#d97706_28%,var(--border))]"
            role="alert"
          >
            <div className="flex gap-2">
              <AlertTriangle
                className="mt-0.5 shrink-0 text-amber-700"
                size={16}
                aria-hidden
              />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-100">
                  Aviso para el vendedor:
                </span>{' '}
                El importe se envía con un{' '}
                <span className="font-mono text-[11px]">Transfer</span> a tu cuenta
                de pago. Ese paso{' '}
                <strong className="font-semibold">
                  no añade otra comisión de procesamiento de tarjeta
                </strong>{' '}
                solo por el Transfer; el cobro del comprador ya pudo incluir tarifas
                de procesamiento. Pueden existir{' '}
                <strong className="font-semibold">otros cargos</strong> (cambio de
                divisa, retiros desde Connect, instant payout, etc.) según tu cuenta
                y país. Consulta{' '}
                <a
                  href={PAYMENT_FEE_POLICY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--primary)] underline"
                >
                  precios y políticas de tarifas
                </a>
                .
              </div>
            </div>
          </div>

          {modal.loadingCards ? (
            <div className="mt-4 flex items-center gap-2 text-[13px] text-[var(--muted)]">
              <CeSpinner size="sm" aria-hidden />
              Cargando tarjetas…
            </div>
          ) : modal.cards.length === 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-[13px] text-[var(--muted)]">
                No hay tarjetas guardadas. Configúralas desde tu perfil.
              </p>
              <button
                type="button"
                className="vt-btn vt-btn-sm inline-flex items-center gap-1.5"
                onClick={() => {
                  onClose()
                  nav('/profile?paymentCards=1')
                }}
              >
                <CreditCard size={14} aria-hidden /> Ir a configurar tarjetas
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                Tarjeta de depósito
              </div>
              <VtSelect
                listPortal
                ariaLabel="Tarjeta donde depositar"
                value={modal.selectedCardId}
                onChange={(v) =>
                  onUpdate((m) => (m ? { ...m, selectedCardId: v } : m))
                }
                options={modal.cards.map((c) => ({
                  value: c.id,
                  label: `${c.brand} •••• ${c.last4}`,
                }))}
                placeholder="Seleccionar tarjeta…"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            className="vt-btn vt-btn-ghost inline-flex items-center gap-1.5 border border-[var(--border)] px-4 py-2"
            disabled={modal.busy || modal.loadingCards}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary inline-flex items-center gap-2"
            disabled={
              modal.busy ||
              modal.loadingCards ||
              modal.cards.length === 0 ||
              !modal.selectedCardId.trim()
            }
            onClick={() =>
              void (async () => {
                onUpdate((m) => (m ? { ...m, busy: true } : m))
                try {
                  await recordSellerServicePayout({
                    threadId,
                    agreementId,
                    paymentId: modal.pay.id,
                    paymentMethodId: modal.selectedCardId,
                  })
                  toast.success('Depósito registrado.')
                  await onRefresh()
                  onClose()
                } catch (e) {
                  toast.error(
                    (e as Error)?.message ?? 'No se pudo registrar el depósito.',
                  )
                } finally {
                  onUpdate((m) => (m ? { ...m, busy: false } : m))
                }
              })()
            }
          >
            {modal.busy ? (
              <CeSpinner size="sm" aria-hidden />
            ) : (
              <BadgeCheck size={16} aria-hidden />
            )}
            Confirmar depósito
          </button>
        </div>
      </div>
    </div>
  )
}
