import { Link } from 'react-router-dom'
import { HelpCircle, Trash2 } from 'lucide-react'
import { CeIconButton } from '@shared/components/ui'
import { cn } from '@shared/lib/cn'
import type { Thread } from '@features/market/logic/store/useMarketStore'
import {
  buyerFirstNameForThread,
  resolveSellerUserId,
} from '@features/chat/logic/participants/chatParticipantLabels'
import {
  fmtChatListShortTime,
  PREMATURE_EXIT_TOOLTIP,
} from '@features/chat/logic/thread/chatListUtils'

type Props = {
  th: Thread
  listTitle: string
  preview: string
  at: number
  meId: string
  meName: string
  profileDisplayNames: Record<string, string>
  activeThreadId?: string
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
  activeThreadId,
  onLeave,
}: Props) {
  const isActive = activeThreadId != null && th.id === activeThreadId
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
        'vt-chat-list-row',
        isActive && !inv && 'vt-chat-list-row--active',
        inv &&
          'border-l-4 border-l-amber-600 bg-[color-mix(in_oklab,#d97706_12%,var(--surface))] pl-1',
      )}
    >
      <Link
        to={`/chat/${th.id}`}
        className={cn(
          'relative flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-inherit no-underline',
          inv && 'hover:bg-[color-mix(in_oklab,#d97706_16%,var(--surface))]',
        )}
        title={inv ? PREMATURE_EXIT_TOOLTIP : undefined}
      >
        {inv ? <span className="sr-only">{PREMATURE_EXIT_TOOLTIP}</span> : null}
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-base font-semibold text-[var(--muted)]"
          aria-hidden
        >
          {avatarLetter.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-baseline justify-between gap-2">
            <div className="truncate text-[15px] font-semibold text-[var(--text)]">
              {listTitle}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {inv ? (
                <span className="flex leading-none text-amber-700" aria-hidden>
                  <HelpCircle size={18} strokeWidth={2.25} />
                </span>
              ) : null}
              <span className="shrink-0 text-xs text-[var(--muted)]">
                {fmtChatListShortTime(at)}
              </span>
            </div>
          </div>
          <div className="truncate text-[13px] text-[var(--muted)]">{preview}</div>
        </div>
      </Link>
      <CeIconButton
        type="button"
        variant="danger"
        className="my-2 mr-2 shrink-0 self-center min-[961px]:mr-3"
        title="Salir: con acuerdo aceptado te expulsa del hilo y pedimos motivo; sin acuerdo, sin motivo ni impacto en confianza"
        aria-label="Salir del chat"
        onClick={() => onLeave(th.id)}
      >
        <Trash2 size={18} strokeWidth={2} aria-hidden />
      </CeIconButton>
    </div>
  )
}
