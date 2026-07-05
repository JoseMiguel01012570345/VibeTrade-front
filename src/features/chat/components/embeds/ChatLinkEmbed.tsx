import { useMemo } from 'react'
import { Link2 } from 'lucide-react'
import type { LinkPreviewResult } from '@features/chat/Dtos/thread/chatApiTypes'
import { useLinkPreview } from '@features/chat/hooks/useLinkPreview'
import { ChatEmbedCard } from './ChatEmbedCard'
import { ChatEmbedFrame } from './ChatEmbedFrame'

export function ChatLinkEmbed({ url }: { url: string }) {
  const previewQuery = useLinkPreview(url)
  const data: LinkPreviewResult | null | undefined = previewQuery.isLoading
    ? undefined
    : (previewQuery.data ?? null)

  const host = useMemo(() => {
    if (!data?.url) return ''
    try {
      return new URL(data.url).host
    } catch {
      return ''
    }
  }, [data?.url])

  if (data === undefined) {
    return (
      <div className="mt-2 max-w-[min(100%,360px)] rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-3 py-2 text-[11px] font-semibold text-[var(--muted)]">
        Vista previa…
      </div>
    )
  }

  if (
    !data ||
    (!data.title?.trim() && !data.description?.trim() && !data.imageUrl?.trim())
  ) {
    return null
  }

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block max-w-[min(100%,380px)] text-left no-underline"
      data-chat-interactive
    >
      <ChatEmbedCard
        bleed
        frame={
          <ChatEmbedFrame
            imageUrl={data.imageUrl}
            fallback={<Link2 size={28} strokeWidth={1.75} aria-hidden />}
          />
        }
        title={data.title?.trim() || host || data.url}
        description={data.description?.trim() || undefined}
        footer={
          host ? (
            <div className="truncate text-[10px] font-bold uppercase tracking-wide text-[var(--muted)] opacity-75">
              {host}
            </div>
          ) : undefined
        }
      />
    </a>
  )
}
