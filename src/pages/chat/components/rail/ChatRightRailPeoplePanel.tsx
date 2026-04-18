import { Link } from 'react-router-dom'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import { ProtectedMediaImg } from '../../../../components/media/ProtectedMediaImg'
import type { ChatParticipant } from '../../lib/chatParticipants'

type Props = {
  bodyClassName: string
  participants: ChatParticipant[]
}

export function ChatRightRailPeoplePanel({ bodyClassName, participants }: Props) {
  return (
    <div className={bodyClassName}>
      <p className="vt-muted mb-3 px-1 py-3 text-[13px]">
        Comprador, vendedor y, si aplica, transportistas con acceso a este hilo.
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {participants.map((p) => (
          <li key={`${p.role}-${p.id}`}>
            <Link
              to={p.href}
              className="relative flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_60%,transparent)] py-2.5 pl-2.5 pr-7 text-inherit no-underline hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))]"
              data-chat-interactive
            >
              <span
                className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[15px] font-black text-[var(--text)]"
                aria-hidden
              >
                {p.avatarUrl ? (
                  <ProtectedMediaImg
                    src={p.avatarUrl}
                    alt=""
                    wrapperClassName="absolute inset-0 size-full"
                    className="size-full object-cover"
                  />
                ) : (
                  p.name.slice(0, 1).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold leading-tight">{p.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-[var(--muted)]">
                  <span className="font-bold">{p.roleLabel}</span>
                  {p.phone ? (
                    <span className="max-w-[140px] truncate font-mono text-[10px]" title={p.phone}>
                      {p.phone}
                    </span>
                  ) : null}
                  {p.verified ? (
                    <span className="inline-flex text-[var(--primary)]" title="Verificado">
                      <ShieldCheck size={12} aria-hidden />
                    </span>
                  ) : null}
                  <span
                    className="ml-auto inline-flex rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2 py-1 text-[11px] font-black text-[var(--muted)]"
                    title="Confianza"
                  >
                    {p.trustScore}
                  </span>
                </div>
                {p.detail ? (
                  <div className="mt-1 text-[10px] leading-snug text-[var(--muted)]">{p.detail}</div>
                ) : null}
              </div>
              <ChevronRight
                size={16}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-45"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
