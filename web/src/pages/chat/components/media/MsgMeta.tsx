import { Check, CheckCheck } from 'lucide-react'
import { cn } from '../../../../lib/cn'

export function hhmm(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MsgMeta({ at, read }: { at: number; read?: boolean }) {
  return (
    <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
      <span className="[font-variant-numeric:tabular-nums]">{hhmm(at)}</span>
      {read !== undefined && (
        <span
          className={cn(
            'inline-flex items-center',
            read && 'text-[color-mix(in_oklab,var(--good)_85%,var(--muted))]',
            !read && 'text-[var(--muted)]',
          )}
          title={read ? 'Leído' : 'Enviado'}
          aria-label={read ? 'Leído' : 'Enviado'}
        >
          {read ? <CheckCheck size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
        </span>
      )}
    </span>
  )
}
