import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bookmark, MessageCircle, Send, ThumbsUp, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../../app/store/useAppStore'
import { cn } from '../../lib/cn'
import {
  getReelsInitialComments,
  getReelsInitialLikeCounts,
  getReelsItems,
} from '../../utils/reels/reelsBootstrapState'
import { ReelCommentsPanel, type ReelComment } from './ReelCommentsPanel'

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

type ReelLikeBundle = { liked: Record<string, boolean>; counts: Record<string, number> }

function reelLikeReducer(
  state: ReelLikeBundle,
  action: { type: 'toggle'; reelId: string },
): ReelLikeBundle {
  if (action.type !== 'toggle') return state
  const { reelId } = action
  const was = !!state.liked[reelId]
  return {
    liked: { ...state.liked, [reelId]: !was },
    counts: {
      ...state.counts,
      [reelId]: Math.max(0, (state.counts[reelId] ?? 0) + (was ? -1 : 1)),
    },
  }
}

const reelBtn =
  'grid h-[46px] w-[46px] shrink-0 cursor-pointer place-items-center rounded-2xl border border-white/25 bg-[rgba(2,6,23,0.4)] text-white [&_svg]:h-5 [&_svg]:w-5'

export function ReelsPage() {
  const [searchParams] = useSearchParams()
  const storeFilter = searchParams.get('store')
  const reelFocusId = searchParams.get('reel')

  const me = useAppStore((s) => s.me)
  const isSessionActive = useAppStore((s) => s.isSessionActive)
  const savedReels = useAppStore((s) => s.savedReels)
  const toggleSavedReel = useAppStore((s) => s.toggleSavedReel)
  const [idx, setIdx] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [reelLikes, dispatchReelLike] = useReducer(reelLikeReducer, {
    liked: {},
    counts: { ...getReelsInitialLikeCounts() },
  })
  const [commentsByReel, setCommentsByReel] = useState<Record<string, ReelComment[]>>(() => ({
    ...getReelsInitialComments(),
  }))
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const isAnimatingRef = useRef(false)

  const reels = useMemo(() => {
    const all = getReelsItems()
    if (storeFilter) return all.filter((r) => r.storeId === storeFilter)
    return all
  }, [storeFilter])

  useEffect(() => {
    if (!reels.length) {
      setIdx(0)
      return
    }
    if (reelFocusId) {
      const i = reels.findIndex((r) => r.id === reelFocusId)
      if (i >= 0) {
        setIdx(i)
        return
      }
    }
    setIdx(0)
  }, [storeFilter, reelFocusId, reels])

  const canPublish = isSessionActive && me.id !== 'guest'
  const currentReel = reels.length ? reels[Math.min(idx, reels.length - 1)] : undefined

  function addComment(text: string, parentId: string | null) {
    if (!currentReel) return
    const reelId = currentReel.id
    const next: ReelComment = {
      id: uid('cmt'),
      parentId,
      authorName: me.name,
      text,
      at: Date.now(),
      ratingsByUser: {},
    }
    setCommentsByReel((prev) => ({
      ...prev,
      [reelId]: [...(prev[reelId] ?? []), next],
    }))
    toast.success(parentId ? 'Respuesta enviada' : 'Comentario enviado')
  }

  function setCommentRating(commentId: string, value: number) {
    if (!currentReel) return
    const reelId = currentReel.id
    const viewerId = me.id
    setCommentsByReel((prev) => {
      const list = prev[reelId] ?? []
      return {
        ...prev,
        [reelId]: list.map((c) => {
          if (c.id !== commentId) return c
          const next = { ...c.ratingsByUser }
          if (value === 0) delete next[viewerId]
          else next[viewerId] = value
          return { ...c, ratingsByUser: next }
        }),
      }
    })
  }

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    let touchStartY: number | null = null

    function goByDelta(deltaY: number) {
      if (shareOpen || commentsOpen) return
      if (isAnimatingRef.current) return
      if (!reels.length) return

      const dir = deltaY > 0 ? 1 : -1
      const jump = Math.max(1, Math.min(3, Math.round(Math.abs(deltaY) / 140)))

      isAnimatingRef.current = true
      setIdx((prev) => {
        const next = (prev + dir * jump) % reels.length
        return next < 0 ? next + reels.length : next
      })

      globalThis.setTimeout(() => {
        isAnimatingRef.current = false
      }, 520)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      goByDelta(e.deltaY)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      touchStartY = t.clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY === null) return
      const touch = e.changedTouches[0]
      const dy = touchStartY - touch.clientY
      touchStartY = null
      if (Math.abs(dy) < 28) return
      goByDelta(dy)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [reels.length, shareOpen, commentsOpen])

  return (
    <div className="h-[calc(100vh-120px)]">
      <div
        className="relative h-full overflow-hidden rounded-[18px] border border-[var(--border)]"
        ref={viewportRef}
        aria-label="Reels"
      >
        {reels.length > 0 ? (
        <div
          className="h-full will-change-transform transition-transform duration-[520ms] ease-[ease]"
          style={{ transform: `translateY(-${idx * 100}%)` }}
        >
          {reels.map((r) => (
            <div
              key={r.id}
              className="relative h-full overflow-hidden border-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${r.cover})` }}
            >
              <div
                className="absolute inset-0 rounded-none bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(0,0,0,0.15),transparent),linear-gradient(180deg,rgba(2,6,23,0.25),rgba(2,6,23,0.75))]"
                aria-hidden
              />

              <div className="container relative z-[2] pt-[18px] text-white">
                <div className="text-[22px] font-black tracking-[-0.03em]">{r.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2.5 text-white/90">
                  {r.by} ·{' '}
                  <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1.5 text-xs text-white/95">
                    {r.category}
                  </span>
                </div>
              </div>

              <div className="absolute right-3 top-1/2 z-[3] flex -translate-y-1/2 flex-col gap-2.5">
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    className={cn(
                      reelBtn,
                      reelLikes.liked[r.id] && 'border-white/35 bg-[rgba(37,99,235,0.55)]',
                    )}
                    onClick={() => dispatchReelLike({ type: 'toggle', reelId: r.id })}
                    title={`Me gusta (${reelLikes.counts[r.id] ?? 0})`}
                    aria-label={
                      reelLikes.liked[r.id]
                        ? `Quitar me gusta, ${reelLikes.counts[r.id] ?? 0} en total`
                        : `Me gusta, ${reelLikes.counts[r.id] ?? 0} en total`
                    }
                    aria-pressed={reelLikes.liked[r.id]}
                  >
                    <ThumbsUp />
                  </button>
                  <span
                    className="min-w-[1.25rem] text-center text-[11px] font-extrabold leading-none text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)] [font-variant-numeric:tabular-nums]"
                    aria-hidden
                  >
                    {reelLikes.counts[r.id] ?? 0}
                  </span>
                </div>

                <button
                  type="button"
                  className={reelBtn}
                  onClick={() => setCommentsOpen(true)}
                  title="Comentarios"
                  aria-label="Abrir comentarios"
                >
                  <MessageCircle />
                </button>
                <button
                  type="button"
                  className={reelBtn}
                  onClick={() => {
                    setShareOpen(true)
                  }}
                  title="Compartir (solo contactos registrados)"
                >
                  <Send />
                </button>
                <button
                  type="button"
                  className={cn(
                    reelBtn,
                    savedReels[r.id] && 'border-white/35 bg-[rgba(37,99,235,0.55)]',
                  )}
                  onClick={() => {
                    toggleSavedReel(r.id)
                    toast(savedReels[r.id] ? 'Quitado de guardados' : 'Guardado', { icon: '🔖' })
                  }}
                  title="Guardar"
                >
                  <Bookmark />
                </button>

                {canPublish && (
                  <button
                    type="button"
                    className={cn(reelBtn, 'bg-[rgba(34,197,94,0.35)]')}
                    onClick={() => {
                      const highTrust = me.trustScore >= 50
                      if (highTrust) toast.success('Publicación creada')
                      else toast('Revisión preventiva: el video quedará pendiente', { icon: '⚠️' })
                    }}
                    title="Publicar Reel profesional"
                  >
                    <Upload />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        ) : (
          <div className="flex h-full min-h-[240px] items-center justify-center bg-[var(--surface)] px-6 text-center">
            <div>
              <p className="text-lg font-semibold text-[var(--text)]">Aún no hay reels</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Cuando haya contenido, podrás verlo aquí.
              </p>
            </div>
          </div>
        )}
      </div>

      <ReelCommentsPanel
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        reel={currentReel ? { id: currentReel.id, title: currentReel.title, by: currentReel.by } : null}
        comments={currentReel ? commentsByReel[currentReel.id] ?? [] : []}
        onAddComment={addComment}
        onSetRating={setCommentRating}
        viewerId={me.id}
      />

      {shareOpen && (
        <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="vt-modal">
            <div className="vt-modal-title">Compartir</div>
            <div className="vt-modal-body">
              Lista de contactos registrados:
              <div className="mt-3 flex flex-wrap gap-2.5">
                {['María', 'Carlos', 'Lucía', 'Pedro'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="vt-btn"
                    onClick={() => {
                      toast.success(`Compartido con ${c}`)
                      setShareOpen(false)
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="vt-modal-actions">
              <button type="button" className="vt-btn" onClick={() => setShareOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
