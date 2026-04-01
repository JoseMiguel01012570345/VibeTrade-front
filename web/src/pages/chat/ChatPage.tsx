import { type ChangeEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowLeft, Mic, Music, Paperclip, Plus, Send, ShieldCheck, Square, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../../app/store/useAppStore'
import { useMarketStore } from '../../app/store/useMarketStore'
import { ImageLightbox, MessageBody, MsgMeta } from './ChatMedia'
import { formatFileSize, inferDocKind, messageAuthorLabel, messagePreviewLine } from './chatAttachments'
import './chat.css'

function TrustChip({ score }: { score: number }) {
  return (
    <span
      className="vt-chat-trust"
      data-chat-interactive
      title="Indicador de confianza. Helper: reputación basada en historial de acciones."
    >
      {score}
    </span>
  )
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
  const sendAudio = useMarketStore((s) => s.sendAudio)
  const sendDocument = useMarketStore((s) => s.sendDocument)

  const [draft, setDraft] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [showContracts, setShowContracts] = useState(false)
  const [showCarrier, setShowCarrier] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const draftInputRef = useRef<HTMLInputElement | null>(null)
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const audioFileInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordChunksRef = useRef<Blob[]>([])
  const recordStartRef = useRef(0)
  const recordTickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)

  useEffect(() => {
    if (threadId === 'demo') {
      const real = ensureThreadForOffer('o1')
      nav(`/chat/${real}`, { replace: true })
    }
  }, [ensureThreadForOffer, nav, threadId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [thread?.messages?.length])

  useEffect(() => {
    return () => {
      if (recordTickRef.current) clearInterval(recordTickRef.current)
      const mr = mediaRecorderRef.current
      if (mr && mr.state !== 'inactive') {
        mr.stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])

  const selectedOrdered = useMemo(() => {
    if (!thread) return []
    const order = new Map(thread.messages.map((m, i) => [m.id, i]))
    return [...selectedIds].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
  }, [selectedIds, thread])

  useEffect(() => {
    if (selectedIds.length > 0) draftInputRef.current?.focus()
  }, [selectedIds.length])

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

  function toggleSelectRow(e: MouseEvent, id: string) {
    if ((e.target as HTMLElement).closest('[data-chat-interactive]')) return
    setSelected((s) => ({ ...s, [id]: !s[id] }))
  }

  function onPickDocument(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !threadId) return
    const url = URL.createObjectURL(f)
    sendDocument(threadId, {
      name: f.name,
      size: formatFileSize(f.size),
      kind: inferDocKind(f.name),
      url,
    })
    setSelected({})
    toast.success('Documento enviado')
  }

  function onPickAudioFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !threadId) return
    const url = URL.createObjectURL(f)
    const el = new Audio()
    el.preload = 'metadata'
    el.src = url
    el.addEventListener(
      'loadedmetadata',
      () => {
        const sec = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 1
        sendAudio(threadId, { url, seconds: Math.max(1, Math.round(sec)) })
        setSelected({})
        toast.success('Audio enviado')
      },
      { once: true },
    )
    el.addEventListener(
      'error',
      () => {
        sendAudio(threadId, { url, seconds: 1 })
        setSelected({})
        toast.success('Audio enviado')
      },
      { once: true },
    )
  }

  function stopVoiceRecording() {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') mr.stop()
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordChunksRef.current = []
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(recordChunksRef.current, { type: mr.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const seconds = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000))
        if (threadId) {
          sendAudio(threadId, { url, seconds })
          setSelected({})
          toast.success('Nota de voz enviada')
        }
        setRecording(false)
        setRecordSecs(0)
        if (recordTickRef.current) {
          clearInterval(recordTickRef.current)
          recordTickRef.current = null
        }
        mediaRecorderRef.current = null
      }
      recordStartRef.current = Date.now()
      mr.start(250)
      setRecording(true)
      setRecordSecs(0)
      recordTickRef.current = setInterval(() => {
        setRecordSecs(Math.floor((Date.now() - recordStartRef.current) / 1000))
      }, 400)
    } catch {
      toast.error('No se pudo acceder al micrófono')
    }
  }

  function toggleVoiceRecording() {
    if (recording) {
      stopVoiceRecording()
    } else {
      void startVoiceRecording()
    }
  }

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
                onClick={(e) => {
                  if (system) return
                  toggleSelectRow(e, m.id)
                }}
              >
                {!system && (
                  <Link
                    to={`/profile/${mine ? me.id : store.id}`}
                    className="vt-chat-avatar"
                    title="Ver perfil"
                    data-chat-interactive
                    onClick={(e) => e.stopPropagation()}
                  >
                    {mine ? me.name.slice(0, 1) : store.name.slice(0, 1)}
                  </Link>
                )}

                <div className="vt-chat-bubble">
                  {!system && (
                    <div className="vt-chat-badge">
                      <span className="vt-chat-name">{mine ? me.name : store.name}</span>
                      <span className="vt-muted" data-chat-interactive>
                        {phone}
                      </span>
                      <TrustChip score={trust} />
                    </div>
                  )}
                  <MessageBody m={m} onImageOpen={setLightboxUrl} />
                  {'at' in m && (
                    <MsgMeta
                      at={m.at}
                      read={'read' in m ? m.read : undefined}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="vt-chat-compose vt-card vt-card-pad">
          {selectedIds.length > 0 && (
            <div className="vt-chat-reply-wa" role="region" aria-label="Respondiendo a mensajes">
              <div className="vt-chat-reply-wa-head">
                <span className="vt-chat-reply-wa-title">
                  Respondiendo a {selectedIds.length} mensaje{selectedIds.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  className="vt-chat-reply-wa-closeall"
                  aria-label="Cancelar respuesta"
                  title="Cancelar"
                  onClick={() => setSelected({})}
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
              <div className="vt-chat-reply-wa-list">
                {selectedOrdered.map((id) => {
                  const msg = thread.messages.find((x) => x.id === id)
                  if (!msg || msg.type === 'certificate') return null
                  const author = messageAuthorLabel(msg, store.name)
                  const preview = messagePreviewLine(msg)
                  return (
                    <div key={id} className="vt-chat-reply-wa-row">
                      <span className="vt-chat-reply-wa-accent" aria-hidden />
                      <div className="vt-chat-reply-wa-snippet">
                        <span className="vt-chat-reply-wa-author">{author}</span>
                        <span className="vt-chat-reply-wa-preview">{preview}</span>
                      </div>
                      <button
                        type="button"
                        className="vt-chat-reply-wa-remove"
                        aria-label={`Quitar cita a ${author}`}
                        onClick={() =>
                          setSelected((s) => {
                            const n = { ...s }
                            delete n[id]
                            return n
                          })
                        }
                      >
                        <X size={16} strokeWidth={2} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="vt-chat-compose-bar">
            <div className="vt-chat-compose-tools">
              <input
                ref={docInputRef}
                type="file"
                className="vt-chat-file-input"
                accept=".pdf,.doc,.docx,.odt,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                aria-hidden
                tabIndex={-1}
                onChange={onPickDocument}
              />
              <input
                ref={audioFileInputRef}
                type="file"
                className="vt-chat-file-input"
                accept="audio/*"
                aria-hidden
                tabIndex={-1}
                onChange={onPickAudioFile}
              />
              <button
                type="button"
                className="vt-chat-tool-btn"
                aria-label="Adjuntar documento"
                title="Documento"
                onClick={() => docInputRef.current?.click()}
              >
                <Paperclip size={22} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={clsx('vt-chat-tool-btn', recording && 'vt-chat-tool-btn-rec')}
                aria-label={recording ? 'Detener y enviar nota de voz' : 'Grabar nota de voz'}
                title={recording ? 'Detener' : 'Nota de voz'}
                onClick={toggleVoiceRecording}
              >
                {recording ? <Square size={18} fill="currentColor" /> : <Mic size={22} strokeWidth={2} />}
              </button>
              <button
                type="button"
                className="vt-chat-tool-btn"
                aria-label="Adjuntar archivo de audio"
                title="Archivo de audio"
                onClick={() => audioFileInputRef.current?.click()}
              >
                <Music size={22} strokeWidth={2} />
              </button>
            </div>
            {recording && (
              <div className="vt-chat-rec-banner" role="status">
                <span className="vt-chat-rec-dot" />
                Grabando… {recordSecs}s — tocá de nuevo para enviar
              </div>
            )}
            <div className="vt-chat-compose-inputrow">
              <input
                ref={draftInputRef}
                className="vt-input"
                placeholder={
                  selectedIds.length ? 'Escribe una respuesta…' : 'Escribe un mensaje…'
                }
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (!draft.trim()) return
                    sendText(thread.id, draft.trim(), selectedIds)
                    setDraft('')
                    setSelected({})
                    return
                  }
                  if (e.key === 'Backspace' && draft === '' && selectedOrdered.length > 0) {
                    e.preventDefault()
                    const last = selectedOrdered[selectedOrdered.length - 1]
                    setSelected((s) => {
                      const n = { ...s }
                      delete n[last]
                      return n
                    })
                  }
                }}
              />
              <button
                type="button"
                className="vt-chat-send-btn"
                aria-label="Enviar mensaje"
                title="Enviar"
                onClick={() => {
                  if (!draft.trim()) return
                  sendText(thread.id, draft.trim(), selectedIds)
                  setDraft('')
                  setSelected({})
                }}
              >
                <Send size={22} strokeWidth={2.25} />
              </button>
            </div>
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

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

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
