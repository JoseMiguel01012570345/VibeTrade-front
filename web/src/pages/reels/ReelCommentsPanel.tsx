import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, ThumbsUp, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { countPositiveRatings } from './reelRating'

export type ReelComment = {
  id: string
  parentId: string | null
  authorName: string
  text: string
  at: number
  /** userId → valoración -1…1; el indicador usa el promedio (color + punto) */
  ratingsByUser: Record<string, number>
}

type Props = {
  open: boolean
  onClose: () => void
  reel: { id: string; title: string; by: string } | null
  comments: ReelComment[]
  onAddComment: (text: string, parentId: string | null) => void
  onSetRating: (commentId: string, value: number) => void
  viewerId: string
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return `hace ${Math.floor(s / 86400)} d`
}

const cmtLikeBtn =
  'flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--text)_18%,transparent)] bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] p-0 text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] hover:text-[var(--text)]'

export function ReelCommentsPanel({
  open,
  onClose,
  reel,
  comments,
  onAddComment,
  onSetRating,
  viewerId,
}: Props) {
  const [draft, setDraft] = useState('')
  const [replyingTo, setReplyingTo] = useState<ReelComment | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setReplyingTo(null)
      setDraft('')
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
      inputRef.current?.focus()
    }
  }, [open, reel?.id])

  const tree = useMemo(() => {
    const byParent = new Map<string | null, ReelComment[]>()
    for (const c of comments) {
      const k = c.parentId
      if (!byParent.has(k)) byParent.set(k, [])
      byParent.get(k)!.push(c)
    }
    for (const arr of byParent.values()) arr.sort((a, b) => a.at - b.at)
    return byParent
  }, [comments])

  function renderThread(parentId: string | null, depth: number) {
    const rows = tree.get(parentId) ?? []
    return rows.map((c) => {
      const childRows = tree.get(c.id) ?? []
      const hasReplies = childRows.length > 0
      const likeTotal = countPositiveRatings(c.ratingsByUser)
      const liked = (c.ratingsByUser[viewerId] ?? 0) > 0
      return (
        <div key={c.id} className="mb-1 min-w-0">
          <div className={cn('box-border flex gap-2.5 py-2.5 pb-1.5', depth > 0 && 'pt-1.5')}>
            <div className="flex w-[38px] shrink-0 flex-col items-center gap-0.5">
              <button
                type="button"
                className={cn(
                  cmtLikeBtn,
                  liked &&
                    'border-[color-mix(in_oklab,var(--primary)_45%,transparent)] bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]',
                )}
                onClick={() => {
                  onSetRating(c.id, liked ? 0 : 1)
                }}
                title={liked ? 'Quitar me gusta' : `Me gusta (${likeTotal})`}
                aria-label={liked ? `Quitar me gusta, ${likeTotal} en total` : `Me gusta, ${likeTotal} en total`}
                aria-pressed={liked}
              >
                <ThumbsUp size={18} strokeWidth={2.25} />
              </button>
              <span
                className={cn(
                  'w-full min-w-full text-center text-[10px] font-extrabold leading-none text-[var(--muted)] [font-variant-numeric:tabular-nums]',
                  liked && 'text-[var(--primary)]',
                )}
                aria-hidden
              >
                {likeTotal}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-black">{c.authorName}</span>
                <span className="text-[11px] text-[var(--muted)]">{timeAgo(c.at)}</span>
              </div>
              <p className="my-1.5 mb-0 break-words text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">
                {c.text}
              </p>
              <button
                type="button"
                className="mt-1.5 border-0 bg-transparent p-0 text-xs font-extrabold text-[var(--primary)] hover:underline"
                onClick={() => {
                  setReplyingTo(c)
                  inputRef.current?.focus()
                }}
              >
                Responder
              </button>
            </div>
          </div>
          {hasReplies && (
            <div
              className="my-0.5 mb-1 ml-0 border-l-2 border-[color-mix(in_oklab,var(--muted)_48%,var(--border))] pl-3"
              role="group"
              aria-label="Respuestas en este hilo"
            >
              {renderThread(c.id, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  function submit() {
    const t = draft.trim()
    if (!t || !reel) return
    onAddComment(t, replyingTo?.id ?? null)
    setDraft('')
    setReplyingTo(null)
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }))
  }

  if (!open || !reel) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex animate-[vt-reel-cmt-in_0.22s_ease] items-end justify-center bg-[rgba(2,6,23,0.52)] px-2"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vt-reel-cmt-title"
      onClick={onClose}
    >
      <div
        className="flex min-h-0 min-w-0 w-full max-w-[820px] animate-[vt-reel-cmt-sheet-up_0.28s_cubic-bezier(0.22,1,0.36,1)] flex-col rounded-t-[20px] border border-b-0 border-[var(--border)] bg-[var(--surface)] shadow-[0_-12px_40px_rgba(2,6,23,0.18)] [max-height:min(82vh,680px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[color-mix(in_oklab,var(--muted)_35%,var(--border))]" aria-hidden />
        <div className="flex min-w-0 items-start justify-between gap-3 border-b border-[var(--border)] px-[18px] pb-2.5 pt-3">
          <div>
            <h2 id="vt-reel-cmt-title" className="m-0 text-lg font-black tracking-[-0.03em]">
              Comentarios
            </h2>
            <div className="mt-1 text-xs leading-snug text-[var(--muted)]">
              {reel.title} · {reel.by}
            </div>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border-0 bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_12%,var(--surface))] hover:text-[var(--text)]"
            onClick={onClose}
            aria-label="Cerrar comentarios"
          >
            <X size={22} />
          </button>
        </div>

        <div
          className="min-h-[120px] min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 pb-4 [scrollbar-width:thin]"
          ref={listRef}
        >
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center text-[var(--muted)]">
              <MessageCircle size={36} strokeWidth={1.5} />
              <p className="m-0 text-sm">Sé el primero en comentar.</p>
            </div>
          ) : (
            renderThread(null, 0)
          )}
        </div>

        <div className="border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] px-3.5 pb-3.5 pt-2.5">
          {replyingTo && (
            <div className="mb-2.5 flex items-start justify-between gap-2 rounded-xl border-l-4 border-l-[#25d366] bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))] px-2.5 py-2">
              <div className="flex min-w-0 flex-1 gap-2">
                <span
                  className="w-0.5 shrink-0 rounded-sm bg-gradient-to-b from-[#25d366] to-[var(--primary)]"
                  aria-hidden
                />
                <div>
                  <span className="block text-xs font-extrabold text-green-700">
                    Respondiendo a {replyingTo.authorName}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{replyingTo.text}</span>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0.5 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_10%,transparent)] hover:text-[var(--text)]"
                aria-label="Cancelar respuesta"
                onClick={() => setReplyingTo(null)}
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div className="flex items-stretch gap-2.5">
            <input
              ref={inputRef}
              className="vt-input min-w-0 flex-1"
              placeholder={replyingTo ? 'Escribe una respuesta…' : 'Escribe un comentario…'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <button
              type="button"
              className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-gradient-to-br from-[var(--primary)] to-[color-mix(in_oklab,var(--primary)_75%,#7c3aed)] text-white shadow-[0_6px_16px_color-mix(in_oklab,var(--primary)_30%,transparent)] hover:brightness-110 active:scale-[0.97]"
              aria-label="Enviar"
              title="Enviar"
              onClick={submit}
            >
              <Send size={20} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
