import type { ReactNode } from 'react'
import { cn } from '@shared/lib/cn'

type Props = {
  imageUrl?: string | null
  aspect?: 'video' | 'square'
  fallback?: ReactNode
  className?: string
}

export function ChatEmbedFrame({
  imageUrl,
  aspect = 'video',
  fallback,
  className,
}: Props) {
  const trimmed = imageUrl?.trim()
  return (
    <div
      className={cn(
        'vt-chat-embed__frame',
        aspect === 'square' && 'vt-chat-embed__frame--square',
        className,
      )}
    >
      {trimmed ? (
        <img src={trimmed} alt="" loading="lazy" />
      ) : fallback ? (
        <div className="flex size-full items-center justify-center text-[var(--muted)]">
          {fallback}
        </div>
      ) : null}
    </div>
  )
}
