import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Bookmark, MessageCircle, Send, ThumbsUp, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../../app/store/useAppStore'
import { cn } from '../../lib/cn'
import { ReelCommentsPanel, type ReelComment } from './ReelCommentsPanel'

type Reel = {
  id: string
  title: string
  category: string
  by: string
  cover: string
}

const DEMO_REELS: Reel[] = [
  {
    id: 'r1',
    title: 'Cosecha: Malanga premium',
    category: 'Mercancías',
    by: 'AgroNorte SRL',
    cover:
      'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'r2',
    title: 'Flete 5 Ton - disponibilidad hoy',
    category: 'Transportista',
    by: 'Flete Rápido',
    cover:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'r3',
    title: 'Cadena fría: exportación hortícola',
    category: 'Logística',
    by: 'Logística Sur',
    cover:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'r4',
    title: 'Granos a granel — origen Rosario',
    category: 'Mercancías',
    by: 'AgroNorte SRL',
    cover:
      'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'r5',
    title: 'Semi-remolque disponible Bs.As. → NEA',
    category: 'Transportista',
    by: 'Logística Sur',
    cover:
      'https://images.unsplash.com/photo-1519003722824-cd2daa86a310?auto=format&fit=crop&w=1200&q=80',
  },
]

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

const INITIAL_REEL_LIKE_COUNTS: Record<string, number> = {
  r1: 128,
  r2: 42,
  r3: 89,
  r4: 203,
  r5: 17,
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

const INITIAL_COMMENTS: Record<string, ReelComment[]> = {
  r1: [
    {
      id: 'rc_demo_1',
      parentId: null,
      authorName: 'María',
      text: '¿Sigue disponible la misma cosecha?',
      at: Date.now() - 3_600_000,
      ratingsByUser: { u_maria: 0.1, u_demo_a: 0.2, u_demo_b: 0.15 },
    },
    {
      id: 'rc_demo_2',
      parentId: 'rc_demo_1',
      authorName: 'AgroNorte SRL',
      text: 'Sí, tenemos stock para esta semana.',
      at: Date.now() - 1_800_000,
      ratingsByUser: { u_store: 0.8, u_demo_a: 0.65, u_demo_c: 0.72 },
    },
  ],
  r2: [],
  r3: [
    {
      id: 'rc_demo_r3_1',
      parentId: null,
      authorName: 'Lucas',
      text: '¿Cubren documentación Aduana?',
      at: Date.now() - 7200_000,
      ratingsByUser: { u_lucas: 0.1, u_demo_d: 0.2 },
    },
  ],
  r4: [],
  r5: [
    {
      id: 'rc_demo_r5_1',
      parentId: null,
      authorName: 'Ana',
      text: 'Precio por km aproximado?',
      at: Date.now() - 5400_000,
      ratingsByUser: { u_ana: 0.15 },
    },
    {
      id: 'rc_demo_r5_2',
      parentId: 'rc_demo_r5_1',
      authorName: 'Logística Sur',
      text: 'Te escribimos al DM con tarifario.',
      at: Date.now() - 3600_000,
      ratingsByUser: { u_store: 0.75 },
    },
  ],
}

const reelBtn =
  'grid h-[46px] w-[46px] shrink-0 cursor-pointer place-items-center rounded-2xl border border-white/25 bg-[rgba(2,6,23,0.4)] text-white [&_svg]:h-5 [&_svg]:w-5'

export function ReelsPage() {
  const me = useAppStore((s) => s.me)
  const savedReels = useAppStore((s) => s.savedReels)
  const toggleSavedReel = useAppStore((s) => s.toggleSavedReel)
  const [idx, setIdx] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [reelLikes, dispatchReelLike] = useReducer(reelLikeReducer, {
    liked: {},
    counts: { ...INITIAL_REEL_LIKE_COUNTS },
  })
  const [commentsByReel, setCommentsByReel] = useState<Record<string, ReelComment[]>>(() => ({
    ...INITIAL_COMMENTS,
  }))
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const isAnimatingRef = useRef(false)

  const reels = useMemo(() => DEMO_REELS, [])
  const canPublish = me.role === 'seller' || me.role === 'carrier'
  const currentReel = reels[idx]

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
              Lista de contactos registrados (demo):
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
