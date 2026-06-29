import { Link } from 'react-router-dom'
import { HelpCircle, LogOut } from 'lucide-react'
import { cn } from '@shared/lib/cn'
import type { Thread } from '@features/market/model/store/useMarketStore'
import {
  buyerFirstNameForThread,
  resolveSellerUserId,
} from '@features/chat/model/chatParticipantLabels'
import {
  fmtChatListShortTime,
  PREMATURE_EXIT_TOOLTIP,
} from '@features/chat/model/chatListUtils'

type Props = {
  th: Thread
  listTitle: string
  preview: string
  at: number
  meId: string
  meName: string
  profileDisplayNames: Record<string, string>
  onLeave: (threadId: string) => void
}

export function ChatListThreadRow({
  th,
  listTitle,
  preview,
  at,
  meId,
  meName,
  profileDisplayNames,
  onLeave,
}: Props) {
  const inv = Boolean(th.prematureExitUnderInvestigation)
  const sellerUid = resolveSellerUserId(th)
  const imSeller = sellerUid != null && meId === sellerUid
  const avatarLetter = imSeller
    ? (
        buyerFirstNameForThread(th, meId, meName, profileDisplayNames) || '?'
      ).charAt(0)
    : (th.store.name || '?').charAt(0)

  return (
    <div
      className={cn(
        'flex items-stretch gap-2 border-b border-[var(--border)] transition-colors duration-150 last:border-b-0',
        inv &&
          '-ml-0.5 border-l-4 border-l-amber-600 bg-[color-mix(in_oklab,#d97706_12%,var(--surface))] pl-2',
      )}
    >
      <Link
        to={`/chat/${th.id}`}
        className={cn(
          'relative flex min-w-0 flex-1 items-start gap-3 py-3.5 text-inherit no-underline transition-colors duration-150',
          inv
            ? 'hover:bg-[color-mix(in_oklab,#d97706_16%,var(--surface))]'
            : 'hover:bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]',
        )}
        title={inv ? PREMATURE_EXIT_TOOLTIP : undefined}
      >
        {inv ? (
          <span className="sr-only">{PREMATURE_EXIT_TOOLTIP}</span>
        ) : null}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_18%,var(--surface))] text-base font-bold text-[var(--primary)]"
          aria-hidden
        >
          {avatarLetter.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="truncate text-[15px] font-semibold">{listTitle}</div>
            <div className="flex shrink-0 items-center gap-1.5">
              {inv ? (
                <span
                  className="flex leading-none text-amber-700"
                  aria-hidden
                >
                  <HelpCircle size={18} strokeWidth={2.25} />
                </span>
              ) : null}
              <span className="shrink-0 text-xs text-[var(--muted)]">
                {fmtChatListShortTime(at)}
              </span>
            </div>
          </div>
          <div className="truncate text-[13px] text-[var(--muted)]">
            {preview}
          </div>
        </div>
      </Link>
      <button
        type="button"
        className="vt-btn my-2 mr-1 inline-flex shrink-0 items-center gap-1.5 self-center text-nowrap text-[13px]"
        title="Salir: con acuerdo aceptado te expulsa del hilo y pedimos motivo; sin acuerdo, sin motivo ni impacto en confianza"
        onClick={() => onLeave(th.id)}
      >
        <LogOut size={16} aria-hidden /> Salir
      </button>
    </div>
  )
}
