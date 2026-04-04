import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle, LogOut, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Message, Thread } from '../../app/store/useMarketStore'
import { threadHasAcceptedAgreement, useMarketStore } from '../../app/store/useMarketStore'
import { cn } from '../../lib/cn'
import { messagePreviewLine } from './lib/chatAttachments'

const PREMATURE_EXIT_TOOLTIP =
  'Este chat se resalta porque registraste una salida con un acuerdo ya aceptado; la plataforma puede revisar el caso.'

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
  const removeThreadFromList = useMarketStore((s) => s.removeThreadFromList)

  function handleExitChat(threadId: string) {
    const th = threads[threadId]
    if (!th) return
    const hadAccepted = threadHasAcceptedAgreement(th)
    if (hadAccepted) {
      const reason = globalThis.prompt('Motivo para salir del chat')
      if (reason == null || !String(reason).trim()) return
      recordChatExitFromList(threadId)
      toast('Salida registrada. Podría revisarse y afectar tu confianza. El chat se quitó de tu lista.', {
        icon: '⚠️',
      })
    } else {
      toast.success('Chat eliminado de tu lista. Sin acuerdo aceptado, sin impacto en tu confianza.')
    }
    removeThreadFromList(threadId)
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
      <div className="mb-4">
        <h1 className="vt-h1">Chats</h1>
        <div className="vt-muted">
          Tus conversaciones con negocios (una por oferta en esta demo). «Salir» <strong>elimina el chat de tu lista</strong>
          . Si <strong>no</strong> hay ningún acuerdo aceptado, no pedimos motivo y no afecta tu confianza (demo). Si ya
          aceptaste un acuerdo, pedimos el motivo de salida y la plataforma puede revisar el caso.
        </div>
      </div>

      <div className="vt-card vt-card-pad">
        {rows.length === 0 ? (
          <div className="px-4 py-7 text-center">
            <MessageCircle size={40} strokeWidth={1.25} className="mb-3 opacity-[0.35]" />
            <div className="vt-muted">Todavía no tenés conversaciones.</div>
            <div className="vt-muted mt-1.5 text-[13px]">Abrí una oferta y tocá «Comprar» para iniciar un chat.</div>
            <Link to="/home" className="vt-btn vt-btn-primary mt-4 inline-flex">
              Ver ofertas
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map(({ th, offerTitle, preview, at }) => {
              const inv = Boolean(th.prematureExitUnderInvestigation)
              return (
                <div
                  key={th.id}
                  className={cn(
                    'flex items-stretch gap-2 border-b border-[var(--border)] transition-colors duration-150 last:border-b-0',
                    inv &&
                      '-ml-0.5 border-l-4 border-l-amber-600 bg-[color-mix(in_oklab,#d97706_12%,var(--surface))] pl-2',
                  )}
                >
                  <Link
                    to={`/chat/${th.id}`}
                    className={cn(
                      'relative flex min-w-0 flex-1 items-start gap-3 py-3.5 text-inherit no-underline transition-colors duration-150',
                      inv
                        ? 'hover:bg-[color-mix(in_oklab,#d97706_16%,var(--surface))]'
                        : 'hover:bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]',
                    )}
                    title={inv ? PREMATURE_EXIT_TOOLTIP : undefined}
                  >
                    {inv ? <span className="sr-only">{PREMATURE_EXIT_TOOLTIP}</span> : null}
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_18%,var(--surface))] text-base font-bold text-[var(--primary)]"
                      aria-hidden
                    >
                      {th.store.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="truncate text-[15px] font-semibold">{th.store.name}</div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {inv ? (
                            <span className="flex leading-none text-amber-700" aria-hidden>
                              <HelpCircle size={18} strokeWidth={2.25} />
                            </span>
                          ) : null}
                          <span className="shrink-0 text-xs text-[var(--muted)]">{fmtShort(at)}</span>
                        </div>
                      </div>
                      <div className="mb-0.5 truncate text-[13px] text-[var(--muted)]">{offerTitle}</div>
                      <div className="truncate text-[13px] text-[var(--muted)]">{preview}</div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    className="vt-btn my-2 mr-1 inline-flex shrink-0 items-center gap-1.5 self-center text-nowrap text-[13px]"
                    title="Quitar de tu lista: sin acuerdo aceptado, sin motivo ni impacto en confianza; con acuerdo aceptado, pedimos motivo"
                    onClick={() => handleExitChat(th.id)}
                  >
                    <LogOut size={16} aria-hidden /> Salir
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
