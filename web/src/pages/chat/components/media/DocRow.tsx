import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import toast from 'react-hot-toast'
import { Download, FileText, Loader2 } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import { downloadDocumentFile } from './documentDownload'

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
        downloaded &&
          'cursor-pointer outline-none hover:brightness-[0.98] focus-visible:shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_45%,transparent)]',
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
