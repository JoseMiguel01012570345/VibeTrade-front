import { useMemo, useState } from 'react'
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

  const reels = useMemo(() => DEMO_REELS, [])
  const r = reels[idx] ?? reels[0]

  const canPublish = me.role === 'seller' || me.role === 'carrier'

  return (
    <div className="vt-reels">
      <div className="vt-reel" style={{ backgroundImage: `url(${r.cover})` }}>
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
                // flujo: validación silenciosa (demo)
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

        <div className="vt-reel-nav">
          <button className="vt-reel-swipe" onClick={() => setIdx((i) => (i <= 0 ? reels.length - 1 : i - 1))}>
            Anterior
          </button>
          <button className="vt-reel-swipe" onClick={() => setIdx((i) => (i + 1) % reels.length)}>
            Siguiente
          </button>
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

