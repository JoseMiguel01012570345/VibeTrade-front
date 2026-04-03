import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import toast from 'react-hot-toast'
import { Check, CheckCheck, Download, FileText, GitBranch, Loader2, MapPin, Pause, Play } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Message, ReplyQuote } from '../../app/store/useMarketStore'
import { statusPillNo, statusPillOk, statusPillPending } from './formModalStyles'
import { agreementDeclaresMerchandise, agreementDeclaresService, type TradeAgreement } from './tradeAgreementTypes'
import { hasMerchandise } from './tradeAgreementValidation'

const ytThread =
  'border-l-[3px] border-[color-mix(in_oklab,var(--muted)_44%,var(--border))] pl-3 ml-px rounded-r-[10px]'

function ChatReplyQuotes({ quotes, inThread }: { quotes: ReplyQuote[]; inThread?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5" aria-label="Mensajes citados">
      <div
        className="mb-0.5 inline-flex items-center gap-1.5 self-start rounded-full border border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface))] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[color-mix(in_oklab,var(--primary)_90%,var(--text))]"
        title="Mensaje dentro de un hilo de respuesta"
      >
        <GitBranch size={14} strokeWidth={2.25} className="shrink-0 opacity-90" aria-hidden />
        <span>Hilo nuevo</span>
      </div>
      {quotes.map((q) => (
        <div
          key={q.id}
          className={cn('min-w-0', inThread ? 'block' : 'flex items-stretch gap-2')}
        >
          <div
            className={cn(
              'shrink-0 rounded bg-gradient-to-b from-[#25d366] to-[color-mix(in_oklab,#25d366_70%,var(--primary))]',
              inThread ? 'mb-1.5 h-1 w-full' : 'mt-0.5 w-1 self-stretch',
            )}
            aria-hidden
          />
          <div
            className={cn(
              'flex min-w-0 flex-col gap-0.5 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] px-2 py-1.5',
              !inThread && 'flex-1',
            )}
          >
            <span className="text-xs font-extrabold text-[#25d366]">{q.author}</span>
            <span className="break-words text-xs leading-snug text-[var(--muted)]">{q.preview}</span>
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
    <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
      <span className="[font-variant-numeric:tabular-nums]">{hhmm(at)}</span>
      {read !== undefined && (
        <span
          className={cn(
            'inline-flex items-center',
            read ? 'text-[color-mix(in_oklab,var(--good)_85%,var(--muted))]' : 'text-[var(--muted)]',
          )}
          title={read ? 'Leído' : 'Enviado'}
          aria-label={read ? 'Leído' : 'Enviado'}
        >
          {read ? <CheckCheck size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
        </span>
      )}
    </span>
  )
}

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
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2" data-chat-interactive>
      <audio ref={ref} src={url} preload="metadata" className="hidden" />
      <button
        type="button"
        className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
        onClick={toggle}
        aria-label={playing ? 'Pausa' : 'Reproducir'}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="h-1.5 min-w-[80px] flex-[1_1_120px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--muted)_22%,var(--surface))]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[color-mix(in_oklab,var(--primary)_70%,#7c3aed)] transition-[width] duration-80 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-[11px] [font-variant-numeric:tabular-nums] text-[var(--muted)]">
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
    <div className={cn('grid grid-cols-1 gap-2', images.length > 1 && 'grid-cols-2')}>
      {images.map((img, i) => (
        <button
          key={i}
          type="button"
          className="block w-full cursor-zoom-in overflow-hidden rounded-xl border border-[var(--border)] bg-[rgba(15,23,42,0.06)] p-0"
          data-chat-interactive
          onClick={() => onOpen(img.url)}
          aria-label={`Ampliar imagen ${i + 1}`}
        >
          <img
            src={img.url}
            alt=""
            loading="lazy"
            className={cn('block w-full object-cover', images.length > 1 ? 'h-[100px]' : 'h-[120px]')}
          />
        </button>
      ))}
    </div>
  )
}

export function DocGrid({
  documents,
  isMine,
}: {
  documents: { name: string; size: string; kind: 'pdf' | 'doc' | 'other'; url?: string }[]
  isMine?: boolean
}) {
  return (
    <div className={cn('grid min-w-0 grid-cols-1 gap-2', documents.length > 1 && 'grid-cols-2')}>
      {documents.map((d, i) => (
        <DocRow key={`${d.name}-${i}`} name={d.name} size={d.size} kind={d.kind} url={d.url} isMine={isMine} />
      ))}
    </div>
  )
}

function DocIcon({ kind }: { kind: 'pdf' | 'doc' | 'other' }) {
  if (kind === 'pdf')
    return (
      <span
        className="grid h-12 w-10 place-items-center rounded-lg border border-black/10 text-[11px] font-black text-[#c62828] bg-[#fde8e8]"
        aria-hidden
      >
        PDF
      </span>
    )
  if (kind === 'doc')
    return (
      <span
        className="grid h-12 w-10 place-items-center rounded-lg border border-black/10 text-base font-black text-[#1565c0] bg-[#e8f0fe]"
        aria-hidden
      >
        W
      </span>
    )
  return (
    <span className="grid h-12 w-10 place-items-center rounded-lg border border-black/10 text-[#546e7a] bg-[#eceff1]" aria-hidden>
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
  isMine,
}: {
  name: string
  size: string
  kind: 'pdf' | 'doc' | 'other'
  url?: string
  isMine?: boolean
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
      className={cn(
        'flex min-w-0 max-w-[min(300px,100%)] w-full items-center gap-2.5 rounded-xl border px-2 py-2 pl-2.5',
        isMine
          ? 'border-[color-mix(in_oklab,#86cf81_35%,var(--border))] bg-[color-mix(in_oklab,#d9fdd3_92%,var(--surface))]'
          : 'border-[color-mix(in_oklab,var(--border)_60%,transparent)] bg-[#f0f2f5]',
        downloaded && 'cursor-pointer outline-none hover:brightness-[0.98] focus-visible:shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_45%,transparent)]',
      )}
      data-chat-interactive
      role={downloaded ? 'button' : undefined}
      tabIndex={downloaded ? 0 : undefined}
      onClick={downloaded ? handleOpen : undefined}
      onKeyDown={downloaded ? handleKeyOpen : undefined}
    >
      <div className="shrink-0">
        <DocIcon kind={kind} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div
          className="line-clamp-2 text-sm font-semibold leading-tight text-[#111b21] [overflow-wrap:anywhere]"
          title={name}
        >
          {name}
        </div>
        <div className="text-xs leading-tight text-[#667781]">
          {downloaded ? (
            <>
              {size} · {kindLabel(kind)} ·{' '}
              <span className="font-semibold text-[#027eb5]">Tocá para abrir</span>
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
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-black/10 text-[#54656f] hover:bg-black/15 hover:text-[#111b21] disabled:cursor-not-allowed disabled:opacity-[0.55]"
          aria-label="Descargar documento"
          disabled={!url || downloading}
          onClick={(e) => {
            e.stopPropagation()
            void onDownload()
          }}
        >
          {downloading ? (
            <Loader2 size={20} className="animate-[vt-doc-spin_0.8s_linear_infinite]" />
          ) : (
            <Download size={20} strokeWidth={2} />
          )}
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
    <div
      className="max-w-full rounded-[14px] border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-3.5 py-3"
      data-chat-interactive
    >
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
        <FileText size={18} aria-hidden />
        <span>Acuerdo de compra</span>
      </div>
      <div className="mt-1.5 text-base font-black tracking-[-0.03em]">{title}</div>
      {agreement ? (
        <div className="mt-1.5 text-sm text-[var(--muted)]">
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
        <div className="mt-2">
          <span className={statusPillPending}>Pendiente de comprador</span>
        </div>
      ) : null}
      {st === 'accepted' ? (
        <div className="mt-2">
          <span className={statusPillOk}>Aceptado · no revocable</span>
        </div>
      ) : null}
      {st === 'rejected' ? (
        <div className="mt-2">
          <span className={statusPillNo}>Rechazado</span>
        </div>
      ) : null}
      {hasRoute ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
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
        <div className="mt-3 flex flex-wrap gap-2">
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
  isMine,
}: {
  m: Message
  onImageOpen: (url: string) => void
  agreementDoc?: TradeAgreement | null
  onAcceptAgreement?: () => void
  onRejectAgreement?: () => void
  canRespondAgreement?: boolean
  onOpenAgreementRouteSheet?: () => void
  isMine?: boolean
}) {
  if (m.type === 'text') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={cn('flex min-w-0 flex-col gap-2', hasThread && ytThread)}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} inThread />}
        <div className={cn(hasThread && 'pt-0.5')}>{m.text}</div>
      </div>
    )
  }
  if (m.type === 'image') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={cn('flex min-w-0 flex-col gap-2', hasThread && ytThread)}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} inThread />}
        <ImageGrid images={m.images} onOpen={onImageOpen} />
        {m.embeddedAudio ? (
          <AudioMicro url={m.embeddedAudio.url} seconds={m.embeddedAudio.seconds} />
        ) : null}
        {m.caption ? (
          <div className="m-0 break-normal text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">{m.caption}</div>
        ) : null}
      </div>
    )
  }
  if (m.type === 'audio') return <AudioMicro url={m.url} seconds={m.seconds} />
  if (m.type === 'docs') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={cn('flex min-w-0 flex-col gap-2', hasThread && ytThread)}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} inThread />}
        <DocGrid documents={m.documents} isMine={isMine} />
        {m.embeddedAudio ? (
          <AudioMicro url={m.embeddedAudio.url} seconds={m.embeddedAudio.seconds} />
        ) : null}
        {m.caption ? (
          <div className="m-0 break-normal text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">{m.caption}</div>
        ) : null}
      </div>
    )
  }
  if (m.type === 'doc') {
    const hasThread = m.replyQuotes && m.replyQuotes.length > 0
    return (
      <div className={cn('flex min-w-0 flex-col gap-2', hasThread && ytThread)}>
        {hasThread && <ChatReplyQuotes quotes={m.replyQuotes!} inThread />}
        <DocRow name={m.name} size={m.size} kind={m.kind} url={m.url} isMine={isMine} />
        {m.caption ? (
          <div className="m-0 break-normal text-sm leading-snug text-[var(--text)] [overflow-wrap:break-word]">{m.caption}</div>
        ) : null}
      </div>
    )
  }
  if (m.type === 'certificate')
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_65%,var(--surface))] p-3">
        <div className="font-black">{m.title}</div>
        <div className="mt-2 text-sm text-[var(--muted)]">{m.body}</div>
        <div className="mt-2.5 inline-flex items-center gap-2 text-xs text-[var(--muted)]">
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
      className="fixed inset-0 z-[200] grid cursor-zoom-out place-items-center bg-[rgba(2,6,23,0.88)] p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Vista a pantalla completa"
      onClick={onClose}
    >
      <button
        type="button"
        className="fixed right-4 top-4 z-[201] grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-white/25 bg-[rgba(2,6,23,0.5)] text-[28px] leading-none text-white"
        onClick={onClose}
        aria-label="Cerrar"
      >
        ×
      </button>
      <img
        src={url}
        alt=""
        className="max-h-[min(100%,92vh)] max-w-[min(100%,96vw)] cursor-default rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
