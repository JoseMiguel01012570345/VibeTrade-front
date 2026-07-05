import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react'
import { FileText, Image as ImageIcon, Mic, Plus, Send, Square } from 'lucide-react'
import { cn } from '@shared/lib/cn'

type Props = {
  draftInputRef: RefObject<HTMLInputElement | null>
  draft: string
  setDraft: Dispatch<SetStateAction<string>>
  recording: boolean
  recordSecs: number
  blockTextWithVoiceAndFiles: boolean
  chatActionsLocked: boolean
  hasComposeToSend: boolean
  canSend: boolean
  pendingDocsCount: number
  pendingImagesCount: number
  hasPendingAudio: boolean
  selectedCount: number
  onPickDocument: (e: ChangeEvent<HTMLInputElement>) => void
  onPickImages: (e: ChangeEvent<HTMLInputElement>) => void
  submitComposer: () => void
  toggleVoiceRecording: () => void
  onBackspaceEmpty: () => void
}

function formatVoiceDur(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function ChatComposerBar({
  draftInputRef,
  draft,
  setDraft,
  recording,
  recordSecs,
  blockTextWithVoiceAndFiles,
  chatActionsLocked,
  hasComposeToSend,
  canSend,
  pendingDocsCount,
  pendingImagesCount,
  hasPendingAudio,
  selectedCount,
  onPickDocument,
  onPickImages,
  submitComposer,
  toggleVoiceRecording,
  onBackspaceEmpty,
}: Props) {
  const [plusOpen, setPlusOpen] = useState(false)
  const plusWrapRef = useRef<HTMLDivElement | null>(null)
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const imgInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!plusOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!plusWrapRef.current?.contains(e.target as Node)) {
        setPlusOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [plusOpen])

  const attachmentsLocked = recording || chatActionsLocked

  const placeholder = recording
    ? `Grabando ${formatVoiceDur(recordSecs)}…`
    : blockTextWithVoiceAndFiles
      ? 'No se puede añadir texto con nota de voz y archivos'
      : pendingDocsCount > 0 || pendingImagesCount > 0 || hasPendingAudio
        ? 'Añade un mensaje (opcional)…'
        : selectedCount > 0
          ? 'Escribe una respuesta…'
          : 'Escribe un mensaje…'

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (recording || blockTextWithVoiceAndFiles || chatActionsLocked) {
      e.preventDefault()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!canSend) return
      submitComposer()
      return
    }
    if (e.key === 'Backspace' && draft === '') {
      e.preventDefault()
      onBackspaceEmpty()
    }
  }

  return (
    <div className="vt-chat-composer-bar">
      <div className="relative shrink-0" ref={plusWrapRef}>
        <button
          type="button"
          className="vt-chat-composer-action"
          aria-label="Adjuntar"
          title="Adjuntar"
          disabled={attachmentsLocked}
          onClick={() => setPlusOpen((o) => !o)}
        >
          <Plus size={22} strokeWidth={2} />
        </button>
        {plusOpen && !attachmentsLocked ? (
          <div className="vt-chat-composer-plus-menu" role="menu">
            <button
              type="button"
              className="vt-chat-composer-plus-item"
              role="menuitem"
              onClick={() => {
                setPlusOpen(false)
                docInputRef.current?.click()
              }}
            >
              <FileText size={18} aria-hidden />
              Documento
            </button>
            <button
              type="button"
              className="vt-chat-composer-plus-item"
              role="menuitem"
              onClick={() => {
                setPlusOpen(false)
                imgInputRef.current?.click()
              }}
            >
              <ImageIcon size={18} aria-hidden />
              Imagen
            </button>
          </div>
        ) : null}
        <input
          ref={docInputRef}
          type="file"
          className="sr-only"
          multiple
          accept=".pdf,.doc,.docx,.odt,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={onPickDocument}
        />
        <input
          ref={imgInputRef}
          type="file"
          className="sr-only"
          accept="image/*"
          multiple
          onChange={onPickImages}
        />
      </div>

      <input
        ref={draftInputRef as RefObject<HTMLInputElement>}
        className="vt-chat-composer-pill"
        disabled={recording || blockTextWithVoiceAndFiles || chatActionsLocked}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
      />

      {hasComposeToSend ? (
        <button
          type="button"
          className={cn('vt-chat-composer-action vt-chat-composer-action--send')}
          aria-label="Enviar mensaje"
          title="Enviar"
          disabled={!canSend}
          onClick={() => {
            if (!canSend) return
            submitComposer()
          }}
        >
          <Send size={20} strokeWidth={2.25} />
        </button>
      ) : (
        <button
          type="button"
          className={cn(
            'vt-chat-composer-action',
            recording &&
              'animate-[vt-rec-pulse_1.2s_ease-in-out_infinite] bg-[color-mix(in_oklab,var(--primary)_18%,var(--surface))] text-[var(--primary)]',
          )}
          disabled={chatActionsLocked && !recording}
          aria-label={recording ? 'Detener y enviar nota de voz' : 'Grabar nota de voz'}
          title={recording ? 'Detener grabación' : 'Nota de voz'}
          onClick={toggleVoiceRecording}
        >
          {recording ? (
            <Square size={18} fill="currentColor" />
          ) : (
            <Mic size={22} strokeWidth={2} />
          )}
        </button>
      )}
    </div>
  )
}
