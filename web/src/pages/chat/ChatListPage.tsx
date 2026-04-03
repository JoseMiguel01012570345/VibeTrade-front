import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { HelpCircle, LogOut, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Message, Thread } from '../../app/store/useMarketStore'
import { useMarketStore } from '../../app/store/useMarketStore'
import { messagePreviewLine } from './chatAttachments'
import './chat-list.css'

const PREMATURE_EXIT_TOOLTIP =
  'Este chat se resalta porque se está investigando una salida prematura: abandonaste la conversación sin un acuerdo aceptado.'

function threadLastActivity(th: Thread): number {
  let t = 0
  for (const m of th.messages) {
    if ('at' in m) t = Math.max(t, m.at)
  }
  return t
}

function lastMessage(th: Thread): Message | undefined {
  let best: Message | undefined
  let bestAt = -1
  for (const m of th.messages) {
    if ('at' in m && m.at > bestAt) {
      bestAt = m.at
      best = m
    }
  }
  return best
}

function fmtShort(ts: number) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ChatListPage() {
  const threads = useMarketStore((s) => s.threads)
  const offers = useMarketStore((s) => s.offers)
  const recordChatExitFromList = useMarketStore((s) => s.recordChatExitFromList)

  function handleExitChat(threadId: string) {
    const reason = globalThis.prompt('Motivo para salir del chat')
    if (reason == null || !String(reason).trim()) return
    recordChatExitFromList(threadId)
    toast('Salida registrada. Se investigará y podría afectar tu confianza.', {
      icon: '⚠️',
    })
  }

  const rows = useMemo(() => {
    const list = Object.values(threads)
    list.sort((a, b) => threadLastActivity(b) - threadLastActivity(a))
    return list.map((th) => {
      const offer = offers[th.offerId]
      const last = lastMessage(th)
      return {
        th,
        offerTitle: offer?.title ?? 'Oferta',
        preview: last ? messagePreviewLine(last) : 'Sin mensajes',
        at: threadLastActivity(th),
      }
    })
  }, [threads, offers])

  return (
    <div className="container vt-page">
      <div className="vt-chatlist-head">
        <h1 className="vt-h1">Chats</h1>
        <div className="vt-muted">
          Tus conversaciones con negocios (una por oferta en esta demo). Usá «Salir» en cada fila para
          registrar la salida; si hay un acuerdo aceptado sin pago, al volver el chat quedará restringido hasta
          pagar.
        </div>
      </div>

      <div className="vt-card vt-card-pad">
        {rows.length === 0 ? (
          <div className="vt-chatlist-empty">
            <MessageCircle size={40} strokeWidth={1.25} style={{ opacity: 0.35, marginBottom: 12 }} />
            <div className="vt-muted">Todavía no tenés conversaciones.</div>
            <div className="vt-muted" style={{ marginTop: 6, fontSize: 13 }}>
              Abrí una oferta y tocá «Comprar» para iniciar un chat.
            </div>
            <Link to="/home" className="vt-btn vt-btn-primary">
              Ver ofertas
            </Link>
          </div>
        ) : (
          <div className="vt-chatlist-list">
            {rows.map(({ th, offerTitle, preview, at }) => (
              <div
                key={th.id}
                className={clsx(
                  'vt-chatlist-row-wrap',
                  th.prematureExitUnderInvestigation && 'vt-chatlist-row-wrap--investigation',
                )}
              >
                <Link
                  to={`/chat/${th.id}`}
                  className="vt-chatlist-row"
                  title={th.prematureExitUnderInvestigation ? PREMATURE_EXIT_TOOLTIP : undefined}
                >
                  {th.prematureExitUnderInvestigation ? (
                    <span className="vt-sr-only">{PREMATURE_EXIT_TOOLTIP}</span>
                  ) : null}
                  <div className="vt-chatlist-avatar" aria-hidden>
                    {th.store.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="vt-chatlist-main">
                    <div className="vt-chatlist-top">
                      <div className="vt-chatlist-title">{th.store.name}</div>
                      <div className="vt-chatlist-top-right">
                        {th.prematureExitUnderInvestigation ? (
                          <span className="vt-chatlist-investigation-mark" aria-hidden>
                            <HelpCircle size={18} strokeWidth={2.25} />
                          </span>
                        ) : null}
                        <span className="vt-chatlist-time">{fmtShort(at)}</span>
                      </div>
                    </div>
                    <div className="vt-chatlist-offer">{offerTitle}</div>
                    <div className="vt-chatlist-preview">{preview}</div>
                  </div>
                </Link>
                <button
                  type="button"
                  className="vt-btn vt-chatlist-exit"
                  title="Registrar salida del chat (puede restringir acciones si hay acuerdo sin pago)"
                  onClick={() => handleExitChat(th.id)}
                >
                  <LogOut size={16} aria-hidden /> Salir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
