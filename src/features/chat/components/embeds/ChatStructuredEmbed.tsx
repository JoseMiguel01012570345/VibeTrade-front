import type { ReactNode } from 'react'
import { cn } from '@shared/lib/cn'

export type StructuredEmbedRow = {
  label: ReactNode
  value: ReactNode
  emphasize?: boolean
}

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  rows: StructuredEmbedRow[]
  footer?: ReactNode
  className?: string
}

export function ChatStructuredEmbed({
  title,
  subtitle,
  rows,
  footer,
  className,
}: Props) {
  return (
    <div className={cn('flex min-w-0 max-w-full flex-col gap-2.5 text-[13px] leading-snug', className)}>
      <div className="font-black text-[var(--text)]">{title}</div>
      {subtitle ? (
        <p className="text-[12px] text-[var(--muted)]">{subtitle}</p>
      ) : null}
      <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-3 py-2.5 text-[12px] space-y-1">
        {rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              'flex justify-between gap-2',
              row.emphasize &&
                'border-t border-[color-mix(in_oklab,var(--border)_85%,transparent)] pt-1.5',
            )}
          >
            <span className={row.emphasize ? 'font-black' : 'text-[var(--muted)]'}>
              {row.label}
            </span>
            <span className={cn('tabular-nums', row.emphasize ? 'font-black' : 'font-semibold')}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
      {footer}
    </div>
  )
}
