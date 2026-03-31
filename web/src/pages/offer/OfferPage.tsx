import { Link, useNavigate, useParams } from 'react-router-dom'
import { MessageSquareText, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../../app/store/useAppStore'
import { useMarketStore } from '../../app/store/useMarketStore'
import './offer.css'

function Trust({
  score,
  helper,
}: {
  score: number
  helper: string
}) {
  return (
    <span className="vt-trustchip" title={helper}>
      Confianza: <b>{score}</b>
    </span>
  )
}

export function OfferPage() {
  const { offerId } = useParams()
  const nav = useNavigate()
  const me = useAppStore((s) => s.me)
  const pushNotification = useAppStore((s) => s.pushNotification)
  const offer = useMarketStore((s) => (offerId ? s.offers[offerId] : undefined))
  const stores = useMarketStore((s) => s.stores)
  const ask = useMarketStore((s) => s.ask)
  const answer = useMarketStore((s) => s.answer)
  const ensureThreadForOffer = useMarketStore((s) => s.ensureThreadForOffer)

  if (!offerId || !offer) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Oferta no encontrada.</div>
      </div>
    )
  }

  const store = stores[offer.storeId]

  return (
    <div className="container vt-page">
      <div className="vt-offerpage">
        <div className="vt-card vt-offerhero">
          <img className="vt-offerhero-img" src={offer.imageUrl} alt={offer.title} />
          <div className="vt-offerhero-body">
            <div className="vt-offerhero-top">
              <div>
                <div className="vt-offerhero-title">{offer.title}</div>
                <div className="vt-muted">{offer.location}</div>
              </div>
              <div className="vt-offerhero-price">{offer.price}</div>
            </div>

            <div className="vt-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Link to={`/store/${store.id}`} className="vt-store-badge">
                <span className="vt-store-dot" />
                {store.name}
                {store.verified ? <span className="vt-verified">Verificado</span> : <span className="vt-unverified">No verificado</span>}
              </Link>
              <Trust score={store.trustScore} helper="Indicador de confianza. A mayor número, mayor reputación." />
            </div>

            <div className="vt-offer-tags">
              {offer.tags.map((t) => (
                <span key={t} className="vt-pill">
                  {t}
                </span>
              ))}
            </div>

            <div className="vt-offer-actions">
              <button
                className="vt-btn"
                onClick={() => {
                  const question = window.prompt('Escribe tu pregunta')
                  if (!question) return
                  const qaId = ask(offer.id, { id: me.id, name: me.name, trustScore: me.trustScore }, question.trim())
                  toast.success('Pregunta enviada')
                  window.setTimeout(() => {
                    answer(offer.id, qaId, 'Podemos coordinar disponibilidad. Gracias por tu consulta.')
                    toast('Respuesta del negocio', { icon: '💬' })
                    pushNotification({
                      kind: 'qa_reply',
                      title: 'Respuesta a tu pregunta',
                      body: `${store.name}: Podemos coordinar disponibilidad. Gracias por tu consulta.`,
                    })
                  }, 1500)
                }}
              >
                <MessageSquareText size={16} /> Preguntar
              </button>
              <button
                className="vt-btn vt-btn-primary"
                onClick={() => {
                  const threadId = ensureThreadForOffer(offer.id)
                  nav(`/chat/${threadId}`)
                }}
              >
                <ShoppingCart size={16} /> Comprar (Chat)
              </button>
            </div>
          </div>
        </div>

        <div className="vt-card vt-card-pad">
          <div className="vt-h2">Preguntas y respuestas (públicas)</div>
          <div className="vt-muted" style={{ marginTop: 6 }}>
            Se muestra identidad del que pregunta y del que responde con su indicador de confianza (sin mostrar el número).
          </div>
          <div className="vt-divider" style={{ margin: '12px 0' }} />

          <div className="vt-qa">
            {offer.qa.length === 0 && <div className="vt-muted">Aún no hay preguntas.</div>}
            {offer.qa.map((qa) => (
              <div key={qa.id} className="vt-qa-item">
                <div className="vt-qa-q">
                  <div className="vt-qa-meta">
                    <b>{qa.askedBy.name}</b>
                    <Trust score={qa.askedBy.trustScore} helper="Indicador de confianza del usuario (tooltip/helper)." />
                  </div>
                  <div>{qa.question}</div>
                </div>
                {qa.answer ? (
                  <div className="vt-qa-a">
                    <div className="vt-qa-meta">
                      <b>{qa.answeredBy?.name ?? 'Negocio'}</b>
                      <Trust
                        score={qa.answeredBy?.trustScore ?? store.trustScore}
                        helper="Indicador de confianza del negocio (tooltip/helper)."
                      />
                    </div>
                    <div>{qa.answer}</div>
                  </div>
                ) : (
                  <div className="vt-muted">Sin respuesta aún.</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button className="vt-btn" onClick={() => nav(-1)}>
          Volver
        </button>
      </div>
    </div>
  )
}

