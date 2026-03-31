import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, MessageCircle, Send, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAppStore } from '../../app/store/useAppStore'
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

function TrustSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={clsx('vt-reel-trust', open && 'vt-reel-trust-open')}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onPointerDown={(e) => {
        setOpen(true)
        ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!open || e.buttons === 0) return
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        const y = (e.clientY - rect.top) / rect.height // 0 top, 1 bottom
        const v = 1 - Math.max(0, Math.min(1, y)) // 1 top (green), 0 bottom (red-ish)
        onChange(v * 2 - 1) // [-1..1]
      }}
    >
      <div className="vt-reel-trust-dot" style={{ top: `${((1 - (value + 1) / 2) * 100).toFixed(1)}%` }} />
    </div>
  )
}

export function ReelsPage() {
  const me = useAppStore((s) => s.me)
  const savedReels = useAppStore((s) => s.savedReels)
  const toggleSavedReel = useAppStore((s) => s.toggleSavedReel)
  const [idx, setIdx] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [trust, setTrust] = useState(0)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const isAnimatingRef = useRef(false)

  const reels = useMemo(() => DEMO_REELS, [])
  const canPublish = me.role === 'seller' || me.role === 'carrier'

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    let touchStartY: number | null = null

    function goByDelta(deltaY: number) {
      if (shareOpen) return
      if (isAnimatingRef.current) return
      if (!reels.length) return

      const dir = deltaY > 0 ? 1 : -1
      // “depending on jump”: bigger wheel => larger step (clamped)
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
      // Prevent normal page scroll so the reel “takes over” the gesture.
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
  }, [reels.length, shareOpen])

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
                <TrustSlider value={trust} onChange={setTrust} />

                <button
                  className="vt-reel-btn"
                  onClick={() => {
                    toast('Comentarios (demo)', { icon: '💬' })
                  }}
                >
                  <MessageCircle />
                </button>
                <button
                  className="vt-reel-btn"
                  onClick={() => {
                    setShareOpen(true)
                  }}
                  title="Compartir (solo contactos registrados)"
                >
                  <Send />
                </button>
                <button
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
              <button className="vt-btn" onClick={() => setShareOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

