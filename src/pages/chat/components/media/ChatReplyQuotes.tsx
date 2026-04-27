import type { MouseEvent } from 'react'
import { GitBranch } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import type { ReplyQuote } from '../../../../app/store/useMarketStore'

export function ChatReplyQuotes({
  quotes,
  inThread,
  onQuoteActivate,
}: {
  quotes: ReplyQuote[]
  inThread?: boolean
  /** Pulsar la tarjeta citada lleva al mensaje original en el hilo. */
  onQuoteActivate?: (quotedMessageId: string) => void
}) {
  const quoteBodyClass = cn(
    'flex min-w-0 flex-col gap-0.5 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] px-2 py-1.5 text-left',
    !inThread && 'flex-1',
    onQuoteActivate &&
      'cursor-pointer transition-colors hover:bg-[color-mix(in_oklab,var(--bg)_72%,var(--surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]',
  )

  return (
    <div className="flex flex-col gap-1.5" aria-label="Mensajes citados">
      <div
        className="mb-0.5 inline-flex items-center gap-1.5 self-start rounded-full border border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface))] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[color-mix(in_oklab,var(--primary)_90%,var(--text))]"
        title="Mensaje dentro de un hilo de respuesta"
      >
        <GitBranch size={14} strokeWidth={2.25} className="shrink-0 opacity-90" aria-hidden />
        <span>Hilo nuevo</span>
      </div>
      {quotes.map((q) => (
        <div key={q.id} className={cn('min-w-0', inThread ? 'block' : 'flex items-stretch gap-2')}>
          <div
            className={cn(
              'shrink-0 rounded bg-gradient-to-b from-[#25d366] to-[color-mix(in_oklab,#25d366_70%,var(--primary))]',
              inThread ? 'mb-1.5 h-1 w-full' : 'mt-0.5 w-1 self-stretch',
            )}
            aria-hidden
          />
          {onQuoteActivate ? (
            <button
              type="button"
              className={quoteBodyClass}
              title="Ir al mensaje citado"
              onClick={(e: MouseEvent) => {
                e.stopPropagation()
                onQuoteActivate(q.id)
              }}
            >
              <span className="text-xs font-extrabold text-[#25d366]">{q.author}</span>
              <span className="break-words text-xs leading-snug text-[var(--muted)]">{q.preview}</span>
            </button>
          ) : (
            <div className={quoteBodyClass}>
              <span className="text-xs font-extrabold text-[#25d366]">{q.author}</span>
              <span className="break-words text-xs leading-snug text-[var(--muted)]">{q.preview}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
