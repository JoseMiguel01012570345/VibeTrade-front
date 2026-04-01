import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, MessageCircle, Send, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAppStore } from '../../app/store/useAppStore'
import { ReelCommentsPanel, type ReelComment } from './ReelCommentsPanel'
import { ReelTrustSlider } from './ReelTrustSlider'
import './reels.css'

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
]

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
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
}

export function ReelsPage() {
  const me = useAppStore((s) => s.me)
  const savedReels = useAppStore((s) => s.savedReels)
  const toggleSavedReel = useAppStore((s) => s.toggleSavedReel)
  const [idx, setIdx] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [trust, setTrust] = useState(0)
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
        [reelId]: list.map((c) =>
          c.id === commentId
            ? { ...c, ratingsByUser: { ...c.ratingsByUser, [viewerId]: value } }
            : c,
        ),
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

      window.setTimeout(() => {
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
    <div className="vt-reels">
      <div className="vt-reels-viewport" ref={viewportRef} aria-label="Reels">
        <div
          className="vt-reel-stack"
          style={
            ({ '--idx': idx } as CSSProperties & Record<string, number>)
          }
        >
          {reels.map((r) => (
            <div key={r.id} className="vt-reel" style={{ backgroundImage: `url(${r.cover})` }}>
              <div className="vt-reel-overlay" />

              <div className="vt-reel-top container">
                <div className="vt-reel-title">{r.title}</div>
                <div className="vt-reel-sub">
                  {r.by} · <span className="vt-pill">{r.category}</span>
                </div>
              </div>

              <div className="vt-reel-side">
                <ReelTrustSlider value={trust} onChange={setTrust} ariaLabel="Valorar este reel" />

                <button
                  type="button"
                  className="vt-reel-btn"
                  onClick={() => setCommentsOpen(true)}
                  title="Comentarios"
                  aria-label="Abrir comentarios"
                >
                  <MessageCircle />
                </button>
                <button
                  type="button"
                  className="vt-reel-btn"
                  onClick={() => {
                    setShareOpen(true)
                  }}
                  title="Compartir (solo contactos registrados)"
                >
                  <Send />
                </button>
                <button
                  type="button"
                  className={clsx('vt-reel-btn', savedReels[r.id] && 'vt-reel-btn-active')}
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
                    className="vt-reel-btn vt-reel-btn-pub"
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
      />

      {shareOpen && (
        <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="vt-modal">
            <div className="vt-modal-title">Compartir</div>
            <div className="vt-modal-body">
              Lista de contactos registrados (demo):
              <div className="vt-reel-contacts">
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
