import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  Headphones,
  MapPin,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../../app/store/useAppStore'
import { type Message, useMarketStore } from '../../app/store/useMarketStore'
import './chat.css'

function hhmm(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function TrustChip({ score }: { score: number }) {
  return (
    <span
      className="vt-chat-trust"
      title="Indicador de confianza. Helper: reputación basada en historial de acciones."
    >
      {score}
    </span>
  )
}

function MsgMeta({ at, read }: { at: number; read?: boolean }) {
  return (
    <span className="vt-chat-meta">
      {hhmm(at)}
      {read ? (
        <span className="vt-chat-read" title="Leído">
          <CheckCheck size={14} />
        </span>
      ) : null}
    </span>
  )
}

function Content({ m }: { m: Message }) {
  if (m.type === 'text') return <div className="vt-chat-text">{m.text}</div>
  if (m.type === 'image')
    return (
      <div className={clsx('vt-chat-grid', m.images.length > 1 && 'vt-chat-grid-multi')}>
        {m.images.map((img, i) => (
          <a key={i} href={img.url} target="_blank" rel="noreferrer" className="vt-chat-img">
            <img src={img.url} alt="imagen" />
          </a>
        ))}
      </div>
    )
  if (m.type === 'audio')
    return (
      <div className="vt-chat-audio">
        <Headphones size={16} />
        <audio controls src={m.url} />
        <span className="vt-muted">{m.seconds}s</span>
      </div>
    )
  if (m.type === 'doc')
    return (
      <div className="vt-chat-doc">
        <FileText size={16} />
        <div className="vt-chat-doc-main">
          <div className="vt-chat-doc-name">{m.name}</div>
          <div className="vt-muted">{m.size}</div>
        </div>
      </div>
    )
  if (m.type === 'certificate')
    return (
      <div className="vt-chat-cert">
        <div className="vt-chat-cert-title">{m.title}</div>
        <div className="vt-chat-cert-body">{m.body}</div>
        <div className="vt-chat-cert-meta">
          <MapPin size={14} /> {hhmm(m.at)}
        </div>
      </div>
    )
  return null
}

export function ChatPage() {
  const { threadId } = useParams()
  const nav = useNavigate()
  const me = useAppStore((s) => s.me)
  const setTrustScore = useAppStore((s) => s.setTrustScore)
  const pushNotification = useAppStore((s) => s.pushNotification)

  const ensureThreadForOffer = useMarketStore((s) => s.ensureThreadForOffer)
  const thread = useMarketStore((s) => (threadId ? s.threads[threadId] : undefined))
  const sendText = useMarketStore((s) => s.sendText)

  const [draft, setDraft] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [showContracts, setShowContracts] = useState(false)
  const [showCarrier, setShowCarrier] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (threadId === 'demo') {
      const real = ensureThreadForOffer('o1')
      nav(`/chat/${real}`, { replace: true })
    }
  }, [ensureThreadForOffer, nav, threadId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [thread?.messages?.length])

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])

  if (!threadId || threadId === 'demo') return null
  if (!thread) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Chat no encontrado.</div>
      </div>
    )
  }

  const store = thread.store
  const transportWarning = !store.transportIncluded

  return (
    <div className="container vt-page">
      <div className="vt-chat">
        <div className="vt-chat-head vt-card vt-card-pad">
          <div className="vt-chat-head-top">
            <button className="vt-btn" onClick={() => nav(-1)} aria-label="Volver">
              <ArrowLeft size={16} />
            </button>
            <div className="vt-chat-head-main">
              <div className="vt-chat-title">{store.name}</div>
              <div className="vt-chat-sub">
                <span className="vt-pill">
                  <ShieldCheck size={14} /> {store.verified ? 'Credenciales validadas' : 'No verificado'}
                </span>
                <span className="vt-pill" title="Disponibilidad de transporte indicada por el perfil del negocio.">
                  Transporte: {store.transportIncluded ? 'incluido' : 'NO incluido'}
                </span>
              </div>
            </div>

            <button className="vt-btn" onClick={() => setShowContracts(true)}>
              Contratos
            </button>
          </div>

          {transportWarning && (
            <div className="vt-chat-warn">
              <div className="vt-chat-warn-text">
                Este producto/servicio no incluye transporte. Podés añadir transportista antes de cerrar el acuerdo.
              </div>
              <button className="vt-btn vt-btn-primary" onClick={() => setShowCarrier(true)}>
                <Plus size={16} /> Añadir Transportista
              </button>
            </div>
          )}
        </div>

        <div className="vt-chat-list vt-card" ref={listRef}>
          {thread.messages.map((m) => {
            const mine = m.from === 'me'
            const system = m.from === 'system'
            const isSelected = !!selected[m.id]
            const phone = mine ? me.phone : '+54 11 0000-0000'
            const trust = mine ? me.trustScore : store.trustScore

            return (
              <div
                key={m.id}
                className={clsx(
                  'vt-chat-row',
                  mine && 'vt-chat-row-mine',
                  system && 'vt-chat-row-system',
                  isSelected && 'vt-chat-row-selected',
                )}
                onClick={() => {
                  if (system) return
                  setSelected((s) => ({ ...s, [m.id]: !s[m.id] }))
                }}
              >
                {!system && (
                  <Link to={`/profile/${mine ? me.id : store.id}`} className="vt-chat-avatar" title="Ver perfil">
                    {mine ? me.name.slice(0, 1) : store.name.slice(0, 1)}
                  </Link>
                )}

                <div className="vt-chat-bubble">
                  {!system && (
                    <div className="vt-chat-badge">
                      <span className="vt-chat-name">{mine ? me.name : store.name}</span>
                      <span className="vt-muted">{phone}</span>
                      <TrustChip score={trust} />
                    </div>
                  )}
                  <Content m={m} />
                  {'at' in m && <MsgMeta at={m.at} read={'read' in m ? m.read : undefined} />}
                </div>
              </div>
            )
          })}
        </div>

        <div className="vt-chat-compose vt-card vt-card-pad">
          {selectedIds.length > 0 && (
            <div className="vt-chat-replybar">
              <span>
                Replicar a <b>{selectedIds.length}</b> mensaje(s)
              </span>
              <button className="vt-btn" onClick={() => setSelected({})}>
                Limpiar
              </button>
            </div>
          )}

          <div className="vt-row">
            <input
              className="vt-input"
              placeholder="Escribe un mensaje…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (!draft.trim()) return
                  sendText(thread.id, draft.trim(), selectedIds)
                  setDraft('')
                  setSelected({})
                }
              }}
            />
            <button
              className="vt-btn vt-btn-primary"
              onClick={() => {
                if (!draft.trim()) return
                sendText(thread.id, draft.trim(), selectedIds)
                setDraft('')
                setSelected({})
              }}
            >
              Enviar
            </button>
          </div>

          <div className="vt-chat-actions2">
            <button
              className="vt-btn"
              onClick={() => {
                pushNotification({
                  kind: 'payment',
                  title: 'Pago',
                  body: 'Se está generando la factura del pago (demo).',
                })
                toast('Se está generando la factura…', { icon: '⚠️' })
              }}
            >
              Pago
            </button>

            <button
              className="vt-btn"
              onClick={() => {
                // quick demo: trust score action animation trigger
                setTrustScore(me.trustScore + 1)
                toast.success('Acción exitosa (sube confianza)')
              }}
            >
              + Confianza
            </button>

            <button
              className="vt-btn"
              onClick={() => {
                const reason = window.prompt('Motivo para salir del chat')
                if (!reason) return
                toast('Salida registrada. Se investigará y podría afectar tu confianza.', { icon: '⚠️' })
              }}
            >
              Salir del chat
            </button>
          </div>
        </div>
      </div>

      {showContracts && (
        <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="vt-modal">
            <div className="vt-modal-title">Contratos (demo)</div>
            <div className="vt-modal-body">
              Aquí se listan acuerdos emitidos, con filtro por usuario y link a hojas de ruta cuando hay mercancías.
            </div>
            <div className="vt-modal-actions">
              <button className="vt-btn" onClick={() => setShowContracts(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCarrier && (
        <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="vt-modal">
            <div className="vt-modal-title">Añadir transportista</div>
            <div className="vt-modal-body">
              <div className="vt-col" style={{ gap: 10 }}>
                <div className="vt-muted">
                  Se despliega un formulario donde se definen términos. El comprador debe aceptar explícitamente el
                  precio del transporte antes de proceder.
                </div>
                <label className="vt-chat-check">
                  <input type="checkbox" /> Estoy de acuerdo con el precio del transporte
                </label>
              </div>
            </div>
            <div className="vt-modal-actions">
              <button className="vt-btn" onClick={() => setShowCarrier(false)}>
                Cancelar
              </button>
              <button
                className="vt-btn vt-btn-primary"
                onClick={() => {
                  toast.success('Transportista añadido (demo)')
                  setShowCarrier(false)
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

