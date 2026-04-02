import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { Check, CheckCheck, Download, FileText, GitBranch, Loader2, MapPin, Pause, Play } from 'lucide-react'
import type { Message, ReplyQuote } from '../../app/store/useMarketStore'
import { agreementDeclaresMerchandise, agreementDeclaresService, type TradeAgreement } from './tradeAgreementTypes'
import { hasMerchandise } from './tradeAgreementValidation'

function ChatReplyQuotes({ quotes }: { quotes: ReplyQuote[] }) {
  return (
    <div className="vt-chat-reply-quotes" aria-label="Mensajes citados">
      <div className="vt-chat-thread-marker" title="Mensaje dentro de un hilo de respuesta">
        <GitBranch size={14} strokeWidth={2.25} aria-hidden />
        <span>Hilo nuevo</span>
      </div>
      {quotes.map((q) => (
        <div key={q.id} className="vt-chat-reply-quote">
          <div className="vt-chat-reply-quote-body">
            <span className="vt-chat-reply-quote-author">{q.author}</span>
            <span className="vt-chat-reply-quote-preview">{q.preview}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function hhmm(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MsgMeta({ at, read }: { at: number; read?: boolean }) {
  return (
    <span className="vt-chat-meta">
      <span className="vt-chat-time">{hhmm(at)}</span>
      {read !== undefined && (
        <span
          className={read ? 'vt-chat-read' : 'vt-chat-sent'}
          title={read ? 'Leído' : 'Enviado'}
          aria-label={read ? 'Leído' : 'Enviado'}
        >
          {read ? <CheckCheck size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
        </span>
      )}
    </span>
  )
}

/** `audio.duration` is often Infinity/NaN for some blobs until fully buffered; guard UI math. */
function finiteDuration(sec: number, fallback: number): number {
  if (Number.isFinite(sec) && sec > 0) return sec
  if (Number.isFinite(fallback) && fallback > 0) return fallback
  return 0
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const s = Math.floor(Math.min(sec, 359_999))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function AudioMicro({ url, seconds }: { url: string; seconds: number }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(() => finiteDuration(seconds, seconds))

  const toggle = useCallback(() => {
    const a = ref.current
    if (!a) return
    if (playing) {
      a.pause()
    } else {
      void a.play()
    }
  }, [playing])

  useEffect(() => {
    setCur(0)
    setDur(finiteDuration(seconds, seconds))
  }, [url, seconds])

  useEffect(() => {
    const a = ref.current
    if (!a) return
    const onTime = () => {
      const t = a.currentTime
      setCur(Number.isFinite(t) && t >= 0 ? t : 0)
    }
    const onMeta = () => setDur(finiteDuration(a.duration, seconds))
    const onDurChange = () => setDur(finiteDuration(a.duration, seconds))
    const onEnd = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('durationchange', onDurChange)
    a.addEventListener('ended', onEnd)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('durationchange', onDurChange)
      a.removeEventListener('ended', onEnd)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
    }
  }, [seconds, url])

  const total = finiteDuration(dur, seconds)
  const pct = total > 0 ? Math.min(100, (cur / total) * 100) : 0

  return (
    <div className="vt-chat-audio-micro" data-chat-interactive>
      <audio ref={ref} src={url} preload="metadata" />
      <button type="button" className="vt-chat-audio-play" onClick={toggle} aria-label={playing ? 'Pausa' : 'Reproducir'}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="vt-chat-audio-track">
        <div className="vt-chat-audio-progress" style={{ width: `${pct}%` }} />
      </div>
      <span className="vt-chat-audio-dur">
        {formatTime(cur)} / {formatTime(total)}
      </span>
    </div>
  )
}

export function ImageGrid({
  images,
  onOpen,
}: {
  images: { url: string }[]
  onOpen: (url: string) => void
}) {
  return (
    <div className={clsx('vt-chat-grid', images.length > 1 && 'vt-chat-grid-multi')}>
      {images.map((img, i) => (
        <button
          key={i}
          type="button"
          className="vt-chat-img-wrap"
          data-chat-interactive
          onClick={() => onOpen(img.url)}
          aria-label={`Ampliar imagen ${i + 1}`}
        >
          <img src={img.url} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  )
}

export function DocGrid({
  documents,
}: {
  documents: { name: string; size: string; kind: 'pdf' | 'doc' | 'other'; url?: string }[]
}) {
  return (
    <div
      className={clsx(
        'vt-chat-docs-grid',
        documents.length > 1 && 'vt-chat-docs-grid-multi',
      )}
    >
      {documents.map((d, i) => (
        <DocRow
          key={`${d.name}-${i}`}
          name={d.name}
          size={d.size}
          kind={d.kind}
          url={d.url}
        />
      ))}
    </div>
  )
}

function DocIcon({ kind }: { kind: 'pdf' | 'doc' | 'other' }) {
  if (kind === 'pdf')
    return (
      <span className="vt-chat-doc-icon vt-chat-doc-pdf" aria-hidden>
        PDF
      </span>
    )
  if (kind === 'doc')
    return (
      <span className="vt-chat-doc-icon vt-chat-doc-word" aria-hidden>
        W
      </span>
    )
  return (
    <span className="vt-chat-doc-icon vt-chat-doc-other" aria-hidden>
      <FileText size={18} />
    </span>
  )
}

function kindLabel(kind: 'pdf' | 'doc' | 'other') {
  if (kind === 'pdf') return 'PDF'
  if (kind === 'doc') return 'Word'
  return 'Documento'
}

type WindowWithSave = Window & {
  showSaveFilePicker?: (options?: { suggestedName?: string }) => Promise<FileSystemFileHandle>
}

/** Returns URL usable to open the file in a new tab (blob: or remote https:) */
async function downloadDocumentFile(
  url: string,
  filename: string,
): Promise<{ ok: true; openUrl: string } | { ok: false }> {
  const w = window as WindowWithSave
  let blob: Blob | null = null
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (res.ok) blob = await res.blob()
  } catch {
    /* CORS / red */
  }

  const blobUrl = blob ? URL.createObjectURL(blob) : null

  if (blob && typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({ suggestedName: filename })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      toast.success('Archivo guardado')
      return { ok: true, openUrl: blobUrl! }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
        return { ok: false }
      }
    }
  }

  if (blob && blobUrl) {
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    toast.success('Descarga iniciada')
    return { ok: true, openUrl: blobUrl }
  }

  if (blobUrl) URL.revokeObjectURL(blobUrl)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  toast('Descarga iniciada (ubicación según tu navegador)', { icon: '⬇️' })
  return { ok: true, openUrl: url }
}

export function DocRow({
  name,
  size,
  kind,
  url,
}: {
  name: string
  size: string
  kind: 'pdf' | 'doc' | 'other'
  url?: string
}) {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [openUrl, setOpenUrl] = useState<string | null>(null)
  const openUrlRef = useRef<string | null>(null)

  useEffect(() => {
    openUrlRef.current = openUrl
  }, [openUrl])

  useEffect(() => {
    return () => {
      const u = openUrlRef.current
      if (u?.startsWith('blob:')) URL.revokeObjectURL(u)
    }
  }, [])

  const onDownload = async () => {
    if (!url) {
      toast.error('Enlace no disponible')
      return
    }
    setDownloading(true)
    try {
      const result = await downloadDocumentFile(url, name)
      if (result.ok) {
        setDownloaded(true)
        setOpenUrl(result.openUrl)
      }
    } catch {
      toast.error('No se pudo descargar. Probá abrir el enlace desde el navegador.')
    } finally {
      setDownloading(false)
    }
  }

  const handleOpen = (e: ReactMouseEvent) => {
    e.stopPropagation()
    const u = openUrl
    if (!u) return
    globalThis.window.open(u, '_blank', 'noopener,noreferrer')
  }

  const handleKeyOpen = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      const u = openUrl
      if (u) globalThis.window.open(u, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className={clsx('vt-chat-doc-wa', downloaded && 'vt-chat-doc-wa-downloaded')}
      data-chat-interactive
      role={downloaded ? 'button' : undefined}
      tabIndex={downloaded ? 0 : undefined}
      onClick={downloaded ? handleOpen : undefined}
      onKeyDown={downloaded ? handleKeyOpen : undefined}
    >
      <div className="vt-chat-doc-wa-icon">
        <DocIcon kind={kind} />
      </div>
      <div className="vt-chat-doc-wa-info">
        <div className="vt-chat-doc-wa-name" title={name}>
          {name}
        </div>
        <div className="vt-chat-doc-wa-meta">
          {downloaded ? (
            <>
              {size} · {kindLabel(kind)} · <span className="vt-chat-doc-wa-tap">Tocá para abrir</span>
            </>
          ) : (
            <>
              {size} · {kindLabel(kind)}
            </>
          )}
        </div>
      </div>
      {!downloaded && (
        <button
          type="button"
          className="vt-chat-doc-wa-dl"
          aria-label="Descargar documento"
          disabled={!url || downloading}
          onClick={(e) => {
            e.stopPropagation()
            void onDownload()
          }}
        >
          {downloading ? <Loader2 size={20} className="vt-chat-doc-wa-spin" /> : <Download size={20} strokeWidth={2} />}
        </button>
      )}
    </div>
  )
}

function AgreementBubble({
  title,
  agreement,
  onAccept,
  onReject,
  canRespond,
  onOpenRouteSheet,
}: {
  title: string
  agreement?: TradeAgreement
  onAccept?: () => void
  onReject?: () => void
  canRespond?: boolean
  onOpenRouteSheet?: () => void
}) {
  const st = agreement?.status
  const hasRoute =
    agreement &&
    agreementDeclaresMerchandise(agreement) &&
    hasMerchandise({ merchandise: agreement.merchandise }) &&
    (agreement.routeSheetId || agreement.routeSheetUrl)
  return (
    <div className="vt-chat-agreement" data-chat-interactive>
      <div className="vt-chat-agreement-head">
        <FileText size={18} aria-hidden />
        <span>Acuerdo de compra</span>
      </div>
      <div className="vt-chat-agreement-title">{title}</div>
      {agreement ? (
        <div className="vt-chat-agreement-summary">
          {agreementDeclaresMerchandise(agreement) && agreementDeclaresService(agreement)
            ? 'Mercancías y servicios'
            : agreementDeclaresMerchandise(agreement)
              ? 'Solo mercancías'
              : agreementDeclaresService(agreement)
                ? 'Solo servicios'
                : 'Sin bloques declarados'}
        </div>
      ) : (
        <div className="vt-muted">Cargando detalle…</div>
      )}
      {st === 'pending_buyer' ? (
        <div className="vt-chat-agreement-status">
          <span className="vt-agr-pill-pending">Pendiente de comprador</span>
        </div>
      ) : null}
      {st === 'accepted' ? (
        <div className="vt-chat-agreement-status">
          <span className="vt-agr-pill-ok">Aceptado · no revocable</span>
        </div>
      ) : null}
      {st === 'rejected' ? (
        <div className="vt-chat-agreement-status">
          <span className="vt-agr-pill-no">Rechazado</span>
        </div>
      ) : null}
      {hasRoute ? (
        <div className="vt-chat-agreement-routes">
          {agreement?.routeSheetId && onOpenRouteSheet ? (
            <button type="button" className="vt-btn vt-btn-sm" onClick={onOpenRouteSheet}>
              Ver hoja de ruta
            </button>
          ) : null}
          {agreement?.routeSheetUrl ? (
            <a
              href={agreement.routeSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="vt-btn vt-btn-sm"
              onClick={(e) => e.stopPropagation()}
            >
              Enlace externo
            </a>
          ) : null}
        </div>
      ) : null}
      {canRespond && st === 'pending_buyer' ? (
        <div className="vt-chat-agreement-actions">
          <button type="button" className="vt-btn vt-btn-primary vt-btn-sm" onClick={onAccept}>
            Aceptar acuerdo
          </button>
          <button type="button" className="vt-btn vt-btn-sm" onClick={onReject}>
            Rechazar
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function MessageBody({
  m,
  onImageOpen,
  agreementDoc,
  onAcceptAgreement,
  onRejectAgreement,
  canRespondAgreement,
  onOpenAgreementRouteSheet,
}: {
  m: Message
  onImageOpen: (url: string) => void
  agreementDoc?: TradeAgreement | null
  onAcceptAgreement?: () => void
  onRejectAgreement?: () => void
  canRespondAgreement?: boolean
  onOpenAgreementRouteSheet?: () => void
}) {
  if (m.type === 'text') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={clsx('vt-chat-text-block', hasThread && 'vt-chat-text-block--yt-thread')}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} />}
        <div className="vt-chat-text">{m.text}</div>
      </div>
    )
  }
  if (m.type === 'image') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={clsx('vt-chat-media-block', hasThread && 'vt-chat-text-block--yt-thread')}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} />}
        <ImageGrid images={m.images} onOpen={onImageOpen} />
        {m.embeddedAudio ? (
          <AudioMicro url={m.embeddedAudio.url} seconds={m.embeddedAudio.seconds} />
        ) : null}
        {m.caption ? <div className="vt-chat-caption">{m.caption}</div> : null}
      </div>
    )
  }
  if (m.type === 'audio') return <AudioMicro url={m.url} seconds={m.seconds} />
  if (m.type === 'docs') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={clsx('vt-chat-media-block', hasThread && 'vt-chat-text-block--yt-thread')}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} />}
        <DocGrid documents={m.documents} />
        {m.embeddedAudio ? (
          <AudioMicro url={m.embeddedAudio.url} seconds={m.embeddedAudio.seconds} />
        ) : null}
        {m.caption ? <div className="vt-chat-caption">{m.caption}</div> : null}
      </div>
    )
  }
  if (m.type === 'doc') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={clsx('vt-chat-media-block', hasThread && 'vt-chat-text-block--yt-thread')}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} />}
        <DocRow name={m.name} size={m.size} kind={m.kind} url={m.url} />
        {m.caption ? <div className="vt-chat-caption">{m.caption}</div> : null}
      </div>
    )
  }
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
  if (m.type === 'agreement')
    return (
      <AgreementBubble
        title={m.title}
        agreement={agreementDoc ?? undefined}
        onAccept={onAcceptAgreement}
        onReject={onRejectAgreement}
        canRespond={canRespondAgreement}
        onOpenRouteSheet={onOpenAgreementRouteSheet}
      />
    )
  return null
}

export function ImageLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!url) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [url, onClose])

  if (!url) return null
  return (
    <div
      className="vt-chat-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Vista a pantalla completa"
      onClick={onClose}
    >
      <button type="button" className="vt-chat-lightbox-close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
      <img src={url} alt="" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
