import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { MessageCircle, Send, X } from 'lucide-react'
import { ReelTrustSlider } from './ReelTrustSlider'
import { averageRating } from './reelRating'

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
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return `hace ${Math.floor(s / 86400)} d`
}

export function ReelCommentsPanel({
  open,
  onClose,
  reel,
  comments,
  onAddComment,
  onSetRating,
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
      return (
        <div key={c.id} className="vt-reel-cmt-thread">
          <div className={clsx('vt-reel-cmt-row', depth > 0 && 'vt-reel-cmt-row-reply')}>
          <ReelTrustSlider
            compact
            ariaLabel={`Valorar comentario de ${c.authorName}`}
            value={averageRating(c.ratingsByUser)}
            unrated={Object.keys(c.ratingsByUser).length === 0}
            onChange={(v) => onSetRating(c.id, v)}
          />
          <div className="vt-reel-cmt-body">
            <div className="vt-reel-cmt-head">
              <span className="vt-reel-cmt-author">{c.authorName}</span>
              <span className="vt-reel-cmt-time">{timeAgo(c.at)}</span>
            </div>
            <p className="vt-reel-cmt-text">{c.text}</p>
            <button
              type="button"
              className="vt-reel-cmt-reply"
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
          <div className="vt-reel-cmt-branch" role="group" aria-label="Respuestas en este hilo">
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
      className="vt-reel-cmt-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vt-reel-cmt-title"
      onClick={onClose}
    >
      <div className="vt-reel-cmt-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="vt-reel-cmt-handle" aria-hidden />
        <div className="vt-reel-cmt-header">
          <div>
            <h2 id="vt-reel-cmt-title" className="vt-reel-cmt-title">
              Comentarios
            </h2>
            <div className="vt-reel-cmt-sub">
              {reel.title} · {reel.by}
            </div>
          </div>
          <button type="button" className="vt-reel-cmt-close" onClick={onClose} aria-label="Cerrar comentarios">
            <X size={22} />
          </button>
        </div>

        <div className="vt-reel-cmt-list" ref={listRef}>
          {comments.length === 0 ? (
            <div className="vt-reel-cmt-empty">
              <MessageCircle size={36} strokeWidth={1.5} />
              <p>Sé el primero en comentar.</p>
            </div>
          ) : (
            renderThread(null, 0)
          )}
        </div>

        <div className="vt-reel-cmt-compose">
          {replyingTo && (
            <div className="vt-reel-cmt-replying">
              <div className="vt-reel-cmt-replying-inner">
                <span className="vt-reel-cmt-replying-bar" aria-hidden />
                <div>
                  <span className="vt-reel-cmt-replying-label">Respondiendo a {replyingTo.authorName}</span>
                  <span className="vt-reel-cmt-replying-snippet">{replyingTo.text}</span>
                </div>
              </div>
              <button
                type="button"
                className="vt-reel-cmt-replying-x"
                aria-label="Cancelar respuesta"
                onClick={() => setReplyingTo(null)}
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div className="vt-reel-cmt-inputrow">
            <input
              ref={inputRef}
              className="vt-input vt-reel-cmt-input"
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
            <button type="button" className="vt-reel-cmt-send" aria-label="Enviar" title="Enviar" onClick={submit}>
              <Send size={20} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
