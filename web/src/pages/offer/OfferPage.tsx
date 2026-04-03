import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageSquareText, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../../app/store/useAppStore'
import { useMarketStore } from '../../app/store/useMarketStore'

function Trust({ score, helper }: { score: number; helper: string }) {
  return (
    <span
      className="rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2.5 py-1.5 text-xs text-[var(--muted)]"
      title={helper}
    >
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
      <div className="flex flex-col gap-3.5">
        <div className="vt-card relative overflow-hidden">
          <button
            className="vt-btn absolute left-3 top-3 z-[2] border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.72)] shadow-[0_10px_25px_rgba(2,6,23,0.18)] backdrop-blur-[10px] hover:bg-[rgba(255,255,255,0.86)]"
            onClick={() => nav(-1)}
          >
            <ArrowLeft size={16} />
          </button>
          <img className="block h-[260px] w-full object-cover" src={offer.imageUrl} alt={offer.title} />
          <div className="flex flex-col gap-3 p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[22px] font-black tracking-[-0.03em]">{offer.title}</div>
                <div className="vt-muted">{offer.location}</div>
              </div>
              <div className="shrink-0 text-lg font-black">{offer.price}</div>
            </div>

            <div className="vt-row flex-wrap justify-between">
              <Link
                to={`/store/${store.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2.5 py-1.5 text-xs font-extrabold text-[var(--text)]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                {store.name}
                {store.verified ? (
                  <span className="ml-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--good)_12%,transparent)] px-2 py-1 text-[11px] font-black text-[color-mix(in_oklab,var(--good)_85%,var(--text))]">
                    Verificado
                  </span>
                ) : (
                  <span className="ml-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bad)_10%,transparent)] px-2 py-1 text-[11px] font-black text-[color-mix(in_oklab,var(--bad)_80%,var(--text))]">
                    No verificado
                  </span>
                )}
              </Link>
              <Trust
                score={store.trustScore}
                helper="Indicador de confianza. A mayor número, mayor reputación."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {offer.tags.map((t) => (
                <span key={t} className="vt-pill">
                  {t}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
              <button
                className="vt-btn"
                onClick={() => {
                  const question = window.prompt('Escribe tu pregunta')
                  if (!question) return
                  const qaId = ask(
                    offer.id,
                    { id: me.id, name: me.name, trustScore: me.trustScore },
                    question.trim(),
                  )
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
                  const threadId = ensureThreadForOffer(offer.id, {
                    buyerId: me.id,
                  })
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
          <div className="vt-muted mt-1.5">
            Se muestra identidad del que pregunta y del que responde con su indicador de confianza (sin mostrar el
            número).
          </div>
          <div className="vt-divider my-3" />

          <div className="flex flex-col gap-2.5">
            {offer.qa.length === 0 && <div className="vt-muted">Aún no hay preguntas.</div>}
            {offer.qa.map((qa) => (
              <div
                key={qa.id}
                className="flex min-w-0 flex-col gap-2.5 rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] p-3 [overflow-wrap:anywhere]"
              >
                <div className="font-semibold">
                  <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2.5">
                    <b className="min-w-0 break-words">{qa.askedBy.name}</b>
                    <Trust
                      score={qa.askedBy.trustScore}
                      helper="Indicador de confianza del usuario (tooltip/helper)."
                    />
                  </div>
                  <div>{qa.question}</div>
                </div>
                {qa.answer ? (
                  <div className="border-t border-dashed border-[var(--border)] pt-2.5 text-[var(--text)]">
                    <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2.5">
                      <b className="min-w-0 break-words">{qa.answeredBy?.name ?? 'Negocio'}</b>
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
      </div>
    </div>
  )
}
