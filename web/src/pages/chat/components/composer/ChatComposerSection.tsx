import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react'
import toast from 'react-hot-toast'
import {
  FileText,
  GitBranch,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Send,
  Square,
  X,
} from 'lucide-react'
import { cn } from '../../../../lib/cn'
import type { Thread } from '../../../../app/store/useMarketStore'
import { messageAuthorLabel, messagePreviewLine } from '../../lib/chatAttachments'

function formatVoiceDur(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export type PendingImg = { id: string; url: string }
export type PendingDoc = {
  id: string
  url: string
  name: string
  size: string
  kind: 'pdf' | 'doc' | 'other'
}

type Me = { id: string; name: string; trustScore: number }

type Props = {
  thread: Thread
  me: Me
  storeName: string
  chatActionsLocked: boolean
  draftInputRef: RefObject<HTMLInputElement | null>
  draft: string
  setDraft: Dispatch<SetStateAction<string>>
  selected: Record<string, boolean>
  setSelected: Dispatch<SetStateAction<Record<string, boolean>>>
  selectedIds: string[]
  selectedOrdered: string[]
  pendingDocs: PendingDoc[]
  pendingImages: PendingImg[]
  pendingAudio: { url: string; seconds: number } | null
  recording: boolean
  recordSecs: number
  blockTextWithVoiceAndFiles: boolean
  hasComposeToSend: boolean
  canSend: boolean
  onPickDocument: (e: ChangeEvent<HTMLInputElement>) => void
  onPickImages: (e: ChangeEvent<HTMLInputElement>) => void
  removePendingDoc: (id: string) => void
  removePendingImage: (id: string) => void
  removePendingAudio: () => void
  submitComposer: () => void
  toggleVoiceRecording: () => void
  markThreadPaymentCompleted: (threadId: string) => void
  pushNotification: (n: {
    kind: 'payment'
    title: string
    body: string
  }) => void
  setTrustScore: (n: number) => void
}

export function ChatComposerSection({
  thread,
  me,
  storeName,
  chatActionsLocked,
  draftInputRef,
  draft,
  setDraft,
  setSelected,
  selectedIds,
  selectedOrdered,
  pendingDocs,
  pendingImages,
  pendingAudio,
  recording,
  recordSecs,
  blockTextWithVoiceAndFiles,
  hasComposeToSend,
  canSend,
  onPickDocument,
  onPickImages,
  removePendingDoc,
  removePendingImage,
  removePendingAudio,
  submitComposer,
  toggleVoiceRecording,
  markThreadPaymentCompleted,
  pushNotification,
  setTrustScore,
}: Props) {
  return (
    <div className="vt-card vt-card-pad flex shrink-0 flex-col gap-2.5">
      {selectedIds.length > 0 && (
        <div
          className="overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--muted)_22%,var(--border))] border-l-4 border-l-[#25d366] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] shadow-[0_1px_0_rgba(15,23,42,0.06)]"
          role="region"
          aria-label="Respondiendo a mensajes en un hilo nuevo"
        >
          <div className="flex items-start gap-2.5 border-b border-dashed border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-gradient-to-br from-[color-mix(in_oklab,var(--primary)_14%,var(--surface))] to-[color-mix(in_oklab,#7c3aed_10%,var(--surface))] px-3 py-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[var(--primary)]"
              aria-hidden
            >
              <GitBranch size={18} strokeWidth={2.25} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] font-black tracking-[-0.02em] text-[var(--text)]">Nuevo hilo</span>
              <span className="text-[11px] leading-snug text-[var(--muted)]">
                Tu mensaje enlaza estas citas y se muestra como continuación de hilo
              </span>
            </div>
          </div>
          <div className="mb-2 flex items-center justify-between gap-2.5 px-3 pb-0 pl-3.5 pt-2.5">
            <span className="text-[13px] font-extrabold text-[color-mix(in_oklab,var(--text)_88%,var(--muted))]">
              Citas en este hilo ({selectedIds.length})
            </span>
            <button
              type="button"
              className="grid cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_14%,transparent)] hover:text-[var(--text)]"
              aria-label="Cancelar respuesta"
              title="Cancelar"
              onClick={() => setSelected({})}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="flex max-h-[140px] flex-col gap-2 overflow-y-auto px-3 pb-2.5 pl-3.5 pr-2.5">
            {selectedOrdered.map((id) => {
              const msg = thread.messages.find((x) => x.id === id)
              if (!msg || msg.type === 'certificate') return null
              const author = messageAuthorLabel(msg, storeName)
              const preview = messagePreviewLine(msg)
              return (
                <div key={id} className="flex min-w-0 items-start gap-2">
                  <span
                    className="mt-0.5 min-h-9 w-1 shrink-0 self-stretch rounded bg-gradient-to-b from-[#25d366] to-[color-mix(in_oklab,#25d366_65%,var(--primary))]"
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-xs font-extrabold text-[#25d366]">{author}</span>
                    <span className="line-clamp-2 text-xs leading-snug text-[var(--muted)]">{preview}</span>
                  </div>
                  <button
                    type="button"
                    className="-mt-0.5 grid shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_12%,transparent)] hover:text-[var(--text)]"
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

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1">
          {recording ? (
            <span
              className="grid h-11 w-11 shrink-0 cursor-not-allowed place-items-center rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[#54656f] opacity-45"
              title="Termina la grabación para adjuntar archivos"
              aria-disabled="true"
              aria-label="Adjuntar documentos (no disponible durante la grabación)"
            >
              <span className="pointer-events-none grid place-items-center" aria-hidden>
                <Paperclip size={22} strokeWidth={2} />
              </span>
            </span>
          ) : (
            <label
              className={cn(
                'relative m-0 grid h-11 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[#54656f] hover:bg-[color-mix(in_oklab,var(--muted)_18%,var(--surface))] hover:text-[#111b21]',
                chatActionsLocked && 'pointer-events-none opacity-40',
              )}
              aria-label="Adjuntar documentos"
              title="Documentos"
            >
              <input
                type="file"
                className="sr-only"
                multiple
                accept=".pdf,.doc,.docx,.odt,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={onPickDocument}
              />
              <span className="pointer-events-none grid place-items-center" aria-hidden>
                <Paperclip size={22} strokeWidth={2} />
              </span>
            </label>
          )}
          {recording ? (
            <span
              className="grid h-11 w-11 shrink-0 cursor-not-allowed place-items-center rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[#54656f] opacity-45"
              title="Termina la grabación para adjuntar archivos"
              aria-disabled="true"
              aria-label="Adjuntar imágenes (no disponible durante la grabación)"
            >
              <span className="pointer-events-none grid place-items-center" aria-hidden>
                <ImageIcon size={22} strokeWidth={2} />
              </span>
            </span>
          ) : (
            <label
              className={cn(
                'relative m-0 grid h-11 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[#54656f] hover:bg-[color-mix(in_oklab,var(--muted)_18%,var(--surface))] hover:text-[#111b21]',
                chatActionsLocked && 'pointer-events-none opacity-40',
              )}
              aria-label="Adjuntar imágenes"
              title="Imágenes"
            >
              <input type="file" className="sr-only" accept="image/*" multiple onChange={onPickImages} />
              <span className="pointer-events-none grid place-items-center" aria-hidden>
                <ImageIcon size={22} strokeWidth={2} />
              </span>
            </label>
          )}
        </div>
        {(pendingDocs.length > 0 || pendingImages.length > 0 || pendingAudio) && (
          <div className="flex min-h-0 flex-wrap items-end gap-2 py-2 pb-1" aria-label="Archivos listos para enviar">
            {pendingDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex min-w-0 max-w-full flex-[1_1_200px] items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2.5 py-2"
              >
                <div className="shrink-0 text-[var(--muted)]" aria-hidden>
                  <FileText size={22} strokeWidth={2} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-extrabold">{doc.name}</span>
                  <span className="text-[11px] text-[var(--muted)]">{doc.size}</span>
                </div>
                <button
                  type="button"
                  className={cn(
                    'grid shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_12%,transparent)] hover:text-[var(--text)]',
                    chatActionsLocked && 'pointer-events-none opacity-[0.35]',
                  )}
                  aria-label={`Quitar ${doc.name}`}
                  onClick={() => removePendingDoc(doc.id)}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
            {pendingImages.map((img) => (
              <div
                key={img.id}
                className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-[var(--border)]"
              >
                <img src={img.url} alt="" className="block h-full w-full object-cover" />
                <button
                  type="button"
                  className={cn(
                    'absolute right-1 top-1 grid h-6 w-6 cursor-pointer place-items-center rounded-full border-0 bg-[rgba(15,23,42,0.65)] leading-none text-white hover:bg-[rgba(15,23,42,0.85)]',
                    chatActionsLocked && 'pointer-events-none opacity-[0.35]',
                  )}
                  aria-label="Quitar imagen"
                  onClick={() => removePendingImage(img.id)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {pendingAudio && (
              <div className="flex min-w-0 max-w-full flex-[1_1_200px] items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-2.5 py-2">
                <div className="grid shrink-0 place-items-center text-[var(--primary)]" aria-hidden>
                  <Mic size={20} strokeWidth={2} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-extrabold">Nota de voz</span>
                  <span className="text-[11px] text-[var(--muted)]">{formatVoiceDur(pendingAudio.seconds)}</span>
                </div>
                <button
                  type="button"
                  className={cn(
                    'grid shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-1 leading-none text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_12%,transparent)] hover:text-[var(--text)]',
                    chatActionsLocked && 'pointer-events-none opacity-[0.35]',
                  )}
                  aria-label="Quitar nota de voz"
                  onClick={() => removePendingAudio()}
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        )}
        {recording && (
          <div
            className="flex items-center gap-2 rounded-[10px] bg-[color-mix(in_oklab,#ef4444_10%,var(--surface))] px-2.5 py-1.5 text-[13px] font-semibold text-[#b91c1c]"
            role="status"
          >
            <span className="h-2 w-2 animate-[vt-rec-dot_1s_ease-in-out_infinite] rounded-full bg-[#ef4444]" />
            Grabando… {recordSecs}s — tocá de nuevo para enviar
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <input
            ref={draftInputRef as RefObject<HTMLInputElement>}
            className="vt-input min-w-0 flex-1 self-stretch"
            disabled={recording || blockTextWithVoiceAndFiles || chatActionsLocked}
            placeholder={
              recording
                ? 'Grabando nota de voz…'
                : blockTextWithVoiceAndFiles
                  ? 'No se puede añadir texto con nota de voz y archivos'
                  : pendingDocs.length > 0 || pendingImages.length > 0 || pendingAudio
                    ? 'Añade un mensaje (opcional)…'
                    : selectedIds.length
                      ? 'Escribe una respuesta…'
                      : 'Escribe un mensaje…'
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
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
                if (pendingImages.length > 0) {
                  e.preventDefault()
                  const last = pendingImages[pendingImages.length - 1]
                  removePendingImage(last.id)
                  return
                }
                if (pendingDocs.length > 0) {
                  e.preventDefault()
                  const last = pendingDocs[pendingDocs.length - 1]
                  removePendingDoc(last.id)
                  return
                }
                if (pendingAudio) {
                  e.preventDefault()
                  removePendingAudio()
                  return
                }
                if (selectedOrdered.length > 0) {
                  e.preventDefault()
                  const last = selectedOrdered[selectedOrdered.length - 1]
                  setSelected((s) => {
                    const n = { ...s }
                    delete n[last]
                    return n
                  })
                }
              }
            }}
          />
          <button
            type="button"
            className={cn(
              'grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[#54656f] hover:bg-[color-mix(in_oklab,var(--muted)_18%,var(--surface))] hover:text-[#111b21]',
              recording &&
                'animate-[vt-rec-pulse_1.2s_ease-in-out_infinite] bg-[color-mix(in_oklab,#ef4444_18%,var(--surface))] text-[#b91c1c] hover:bg-[color-mix(in_oklab,#ef4444_18%,var(--surface))] hover:text-[#b91c1c]',
            )}
            disabled={chatActionsLocked && !recording}
            aria-label={recording ? 'Detener y enviar nota de voz' : 'Grabar nota de voz'}
            title={recording ? 'Detener grabación' : 'Nota de voz'}
            onClick={toggleVoiceRecording}
          >
            {recording ? <Square size={18} fill="currentColor" /> : <Mic size={22} strokeWidth={2} />}
          </button>
          {hasComposeToSend && (
            <button
              type="button"
              className={cn(
                'grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-gradient-to-br from-[var(--primary)] to-[color-mix(in_oklab,var(--primary)_75%,#7c3aed)] text-white shadow-[0_8px_20px_color-mix(in_oklab,var(--primary)_35%,transparent)] hover:brightness-105 active:scale-[0.97]',
                !canSend &&
                  'cursor-not-allowed opacity-45 [filter:grayscale(0.2)] hover:brightness-100 active:scale-100',
              )}
              aria-label="Enviar mensaje"
              title="Enviar"
              disabled={!canSend}
              onClick={() => {
                if (!canSend) return
                submitComposer()
              }}
            >
              <Send size={22} strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          className="vt-btn"
          onClick={() => {
            markThreadPaymentCompleted(thread.id)
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
          disabled={chatActionsLocked}
          title={chatActionsLocked ? 'No disponible hasta registrar el pago' : undefined}
          onClick={() => {
            setTrustScore(me.trustScore + 1)
            toast.success('Acción exitosa (sube confianza)')
          }}
        >
          + Confianza
        </button>
      </div>
    </div>
  )
}
