import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MessageSquareText, ShoppingCart } from 'lucide-react'
import { useAppStore } from '../../app/store/useAppStore'
import { useMarketStore } from '../../app/store/useMarketStore'
import './home.css'

export function HomePage() {
  const nav = useNavigate()
  const me = useAppStore((s) => s.me)
  const pushNotification = useAppStore((s) => s.pushNotification)

  const offerIds = useMarketStore((s) => s.offerIds)
  const offers = useMarketStore((s) => s.offers)
  const stores = useMarketStore((s) => s.stores)
  const ask = useMarketStore((s) => s.ask)
  const answer = useMarketStore((s) => s.answer)
  const ensureThreadForOffer = useMarketStore((s) => s.ensureThreadForOffer)

  const [askOpen, setAskOpen] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const items = useMemo(() => offerIds.map((id) => offers[id]).filter(Boolean), [offerIds, offers])

  return (
    <div className="container vt-page">
      <div className="vt-home-head">
        <div>
          <h1 className="vt-h1">Ofertas</h1>
          <div className="vt-muted">Scroll con ofertas afines a tus intereses (demo).</div>
        </div>
      </div>

      <div className="vt-home-grid">
        {items.map((o) => {
          const store = stores[o.storeId]
          return (
            <div key={o.id} className="vt-card vt-offer">
              <Link to={`/offer/${o.id}`} className="vt-offer-media">
                <img src={o.imageUrl} alt={o.title} />
              </Link>

              <div className="vt-offer-body">
                <div className="vt-offer-top">
                  <div className="vt-offer-title">
                    <Link to={`/offer/${o.id}`}>{o.title}</Link>
                  </div>
                  <div className="vt-offer-price">{o.price}</div>
                </div>

                <div className="vt-offer-sub">
                  <div className="vt-muted">{o.location}</div>
                  <Link to={`/store/${store.id}`} className="vt-store-badge">
                    <span className="vt-store-dot" />
                    {store.name}
                  </Link>
                </div>

                <div className="vt-offer-tags">
                  {o.tags.map((t) => (
                    <span key={t} className="vt-pill">
                      {t}
                    </span>
                  ))}
                </div>

                {askOpen === o.id && (
                  <div className="vt-ask">
                    <textarea
                      className="vt-input"
                      rows={2}
                      placeholder="Escribe tu pregunta…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                    <div className="vt-row" style={{ justifyContent: 'flex-end' }}>
                      <button className="vt-btn" onClick={() => (setAskOpen(null), setQ(''))}>
                        Cancelar
                      </button>
                      <button
                        className="vt-btn vt-btn-primary"
                        disabled={q.trim().length < 3}
                        onClick={() => {
                          const qaId = ask(o.id, { id: me.id, name: me.name, trustScore: me.trustScore }, q.trim())
                          setAskOpen(null)
                          setQ('')
                          toast.success('Pregunta enviada')

                          window.setTimeout(() => {
                            answer(o.id, qaId, '¡Gracias! Sí, disponible. Podemos coordinar por chat.')
                            toast('Respuesta del negocio', { icon: '💬' })
                            pushNotification({
                              kind: 'qa_reply',
                              title: 'Respuesta a tu pregunta',
                              body: `${store.name}: ¡Gracias! Sí, disponible. Podemos coordinar por chat.`,
                            })
                          }, 1500)
                        }}
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}

                <div className="vt-offer-actions">
                  <button
                    className="vt-btn"
                    onClick={() => setAskOpen((x) => (x === o.id ? null : o.id))}
                  >
                    <MessageSquareText size={16} /> Preguntar
                  </button>
                  <button
                    className="vt-btn vt-btn-primary"
                    onClick={() => {
                      const threadId = ensureThreadForOffer(o.id)
                      nav(`/chat/${threadId}`)
                    }}
                  >
                    <ShoppingCart size={16} /> Comprar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

