import type { ReactNode } from 'react'
import { cn } from '@shared/lib/cn'

type Props = {
  frame?: ReactNode
  header?: ReactNode
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  className?: string
  bleed?: boolean
}

export function ChatEmbedCard({
  frame,
  header,
  title,
  description,
  footer,
  className,
  bleed = false,
}: Props) {
  return (
    <div
      className={cn(
        bleed ? 'vt-chat-embed' : 'vt-chat-embed-card',
        className,
      )}
    >
      {frame}
      <div className={cn(!bleed && frame && 'vt-chat-embed__body', bleed && 'p-2.5')}>
        {header}
        {title ? (
          <div className="line-clamp-2 text-[13px] font-black leading-snug text-[var(--text)]">
            {title}
          </div>
        ) : null}
        {description ? (
          <div className="mt-1 line-clamp-3 text-[11px] font-semibold leading-snug text-[var(--muted)]">
            {description}
          </div>
        ) : null}
      </div>
      {footer ? (
        <div className={cn(!bleed && 'vt-chat-embed__footer')}>{footer}</div>
      ) : null}
    </div>
  )
}
