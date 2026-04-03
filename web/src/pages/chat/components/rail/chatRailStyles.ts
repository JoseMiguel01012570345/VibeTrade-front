import { cn } from '../../../../lib/cn'
import type { TradeAgreement } from '../../domain/tradeAgreementTypes'
import { statusPillNo, statusPillOk, statusPillPending } from '../../styles/formModalStyles'

export type ContractFilter = 'all' | 'store' | 'buyer'

export const RAIL_ROOT =
  'vt-chat-rail flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] max-[960px]:min-h-[min(480px,70vh)]'

export const RAIL_BODY =
  'min-h-0 flex-1 overflow-auto px-3.5 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'

export const TAB_BASE =
  'flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-0 bg-transparent py-2.5 text-[13px] font-extrabold text-[var(--muted)] max-[1100px]:gap-1 max-[1100px]:px-1 max-[1100px]:text-[11px]'

export const TAB_ON =
  'text-[var(--text)] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] shadow-[inset_0_-2px_0_var(--primary)]'

export const railItemClass =
  'relative w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_60%,transparent)] py-2.5 pl-2.5 pr-7 text-left hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))]'

export function contractStatusLabel(s: TradeAgreement['status']) {
  switch (s) {
    case 'pending_buyer':
      return 'Pendiente'
    case 'accepted':
      return 'Aceptado'
    case 'rejected':
      return 'Rechazado'
    default:
      return s
  }
}

export function contractStatusClass(s: TradeAgreement['status']) {
  switch (s) {
    case 'pending_buyer':
      return statusPillPending
    case 'accepted':
      return statusPillOk
    case 'rejected':
      return statusPillNo
    default:
      return ''
  }
}

export function filterChipClass(on: boolean) {
  return cn(
    'cursor-pointer rounded-full border px-2 py-1 text-[11px]',
    on
      ? 'border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] font-extrabold'
      : 'border-[var(--border)] bg-[var(--surface)]',
  )
}
