import type { Dispatch, SetStateAction } from 'react'
import toast from 'react-hot-toast'
import { BadgeCheck, Loader2, Pencil, Upload, XCircle } from 'lucide-react'
import type { ServiceEvidenceAttachmentApi } from '@features/chat/Dtos/agreement/agreementServiceEvidenceApiTypes';
import {
  useDecideServiceEvidenceMutation,
  useUpsertServiceEvidenceMutation,
} from '@features/chat/hooks/useAgreementEvidenceMutations'
import { uploadMedia, mediaApiUrl } from '@shared/services/media/mediaClient'
import { EvidenceAttachmentsList } from '../shared/EvidenceAttachmentsList'
import {
  fmtAgreementMoneyMinor,
  normalizeEvidenceForCompare,
} from './agreementDetailPresentation'
import type { EvidenceModalState } from '@features/chat/Dtos/agreement/agreementDetailUiTypes'

type Props = {
  threadId: string
  agreementId: string
  modal: NonNullable<EvidenceModalState>
  sellerCanEdit: boolean
  onClose: () => void
  onUpdate: Dispatch<SetStateAction<EvidenceModalState>>
  onRefresh: () => Promise<unknown>
}

export function AgreementServiceEvidenceModal({
  threadId,
  agreementId,
  modal,
  sellerCanEdit,
  onClose,
  onUpdate,
  onRefresh,
}: Props) {
  const upsertMutation = useUpsertServiceEvidenceMutation(threadId, agreementId)
  const decideMutation = useDecideServiceEvidenceMutation(threadId, agreementId)
  const evStatus = (modal.pay.evidence?.status ?? '').trim().toLowerCase()
  const buyerCanDecide = !sellerCanEdit && evStatus === 'submitted'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div className="text-[13px] font-black text-[var(--text)]">
              Evidencia · mes {modal.pay.entryMonth} día {modal.pay.entryDay}
            </div>
            <div className="vt-muted mt-0.5 text-[12px]">
              {fmtAgreementMoneyMinor(
                modal.pay.amountMinor,
                modal.pay.currencyLower,
              )}{' '}
              · Estado pago: {modal.pay.status}
            </div>
          </div>
          <button
            type="button"
            className="vt-btn vt-btn-ghost inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-2"
            onClick={onClose}
            disabled={modal.busy}
          >
            <XCircle size={16} aria-hidden /> Cerrar
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
          {sellerCanEdit ? (
            <>
              <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                Texto
              </div>
              <textarea
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-[13px] text-[var(--text)] outline-none"
                rows={6}
                value={modal.text}
                onChange={(e) =>
                  onUpdate((m) => (m ? { ...m, text: e.target.value } : m))
                }
                placeholder="Describe la evidencia del servicio…"
                disabled={modal.busy}
              />

              <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                Adjuntos
              </div>
              <p className="vt-muted mt-1 text-[12px]">
                Podés subir imágenes o documentos.
              </p>
              <EvidenceAttachmentsList
                atts={modal.attachments}
                onRemove={(id) =>
                  onUpdate((m) =>
                    m
                      ? {
                          ...m,
                          attachments: m.attachments.filter((a) => a.id !== id),
                        }
                      : m,
                  )
                }
              />

              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] px-3 py-2 text-[13px] font-semibold text-[var(--text)]">
                <Upload size={16} aria-hidden />
                Subir archivos
                {modal.uploading ? (
                  <Loader2 className="animate-spin" size={16} aria-hidden />
                ) : null}
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    e.target.value = ''
                    if (!files.length) return
                    void (async () => {
                      onUpdate((m) =>
                        m ? { ...m, busy: true, uploading: true } : m,
                      )
                      try {
                        const uploaded: ServiceEvidenceAttachmentApi[] = []
                        for (const f of files) {
                          const r = await uploadMedia(f)
                          const kind = r.mimeType?.startsWith('image/')
                            ? 'image'
                            : 'document'
                          uploaded.push({
                            id: crypto.randomUUID(),
                            url: mediaApiUrl(r.id),
                            fileName: r.fileName,
                            kind,
                          })
                        }
                        onUpdate((m) =>
                          m
                            ? {
                                ...m,
                                attachments: [...m.attachments, ...uploaded],
                              }
                            : m,
                        )
                      } catch (err) {
                        toast.error(
                          (err as Error)?.message ??
                            'No se pudo subir el adjunto.',
                        )
                      } finally {
                        onUpdate((m) =>
                          m ? { ...m, busy: false, uploading: false } : m,
                        )
                      }
                    })()
                  }}
                  disabled={modal.busy}
                />
              </label>
            </>
          ) : modal.pay.evidence ? (
            <>
              <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                Texto
              </div>
              <div className="mt-1 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-[13px] text-[var(--text)]">
                {modal.pay.evidence.text?.trim() || '—'}
              </div>
              <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                Adjuntos
              </div>
              <EvidenceAttachmentsList
                atts={modal.pay.evidence.attachments ?? []}
              />
            </>
          ) : (
            <div className="vt-muted text-[13px]">
              Aún no hay evidencia cargada.
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
          {sellerCanEdit ? (
            <SellerEvidenceActions
              threadId={threadId}
              agreementId={agreementId}
              modal={modal}
              onUpdate={onUpdate}
              onClose={onClose}
              onRefresh={onRefresh}
              upsertEvidence={upsertMutation.mutateAsync}
            />
          ) : buyerCanDecide ? (
            <>
              <button
                type="button"
                className="vt-btn vt-btn-primary inline-flex items-center gap-2"
                disabled={modal.busy}
                onClick={() =>
                  void decideEvidence('accept', {
                    threadId,
                    agreementId,
                    modal,
                    onUpdate,
                    onClose,
                    onRefresh,
                    decide: decideMutation.mutateAsync,
                  })
                }
              >
                <BadgeCheck size={16} aria-hidden /> Aceptar
              </button>
              <button
                type="button"
                className="vt-btn vt-btn-ghost inline-flex items-center gap-2 border border-[var(--border)] px-5 py-2.5"
                disabled={modal.busy}
                onClick={() =>
                  void decideEvidence('reject', {
                    threadId,
                    agreementId,
                    modal,
                    onUpdate,
                    onClose,
                    onRefresh,
                    decide: decideMutation.mutateAsync,
                  })
                }
              >
                <XCircle size={16} aria-hidden /> Rechazar
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SellerEvidenceActions({
  threadId,
  agreementId,
  modal,
  onUpdate,
  onClose,
  onRefresh,
  upsertEvidence,
}: {
  threadId: string
  agreementId: string
  modal: NonNullable<EvidenceModalState>
  onUpdate: Dispatch<SetStateAction<EvidenceModalState>>
  onClose: () => void
  onRefresh: () => Promise<unknown>
  upsertEvidence: ReturnType<typeof useUpsertServiceEvidenceMutation>['mutateAsync']
}) {
  const original = modal.pay.evidence
  const a0 = normalizeEvidenceForCompare(
    original?.text ?? '',
    original?.attachments ?? [],
  )
  const a1 = normalizeEvidenceForCompare(modal.text, modal.attachments)
  const dirty = a0.text !== a1.text || a0.attsKey !== a1.attsKey
  const noChanges = !dirty
  const disabled = modal.busy || noChanges

  return (
    <>
      <button
        type="button"
        className="vt-btn vt-btn-ghost inline-flex items-center gap-2 border border-[var(--border)] px-5 py-2.5"
        disabled={disabled}
        onClick={() =>
          void saveEvidence(false, {
            threadId,
            agreementId,
            modal,
            noChanges,
            onUpdate,
            onClose,
            onRefresh,
            upsert: upsertEvidence,
          })
        }
      >
        <Pencil size={16} aria-hidden />
        Guardar borrador
      </button>
      <button
        type="button"
        className="vt-btn vt-btn-primary inline-flex items-center gap-2"
        disabled={disabled}
        onClick={() =>
          void saveEvidence(true, {
            threadId,
            agreementId,
            modal,
            noChanges,
            onUpdate,
            onClose,
            onRefresh,
            upsert: upsertEvidence,
          })
        }
      >
        <BadgeCheck size={16} aria-hidden />
        Enviar evidencia
      </button>
    </>
  )
}

async function saveEvidence(
  submit: boolean,
  ctx: {
    threadId: string
    agreementId: string
    modal: NonNullable<EvidenceModalState>
    noChanges: boolean
    onUpdate: Dispatch<SetStateAction<EvidenceModalState>>
    onClose: () => void
    onRefresh: () => Promise<unknown>
    upsert: ReturnType<typeof useUpsertServiceEvidenceMutation>['mutateAsync']
  },
) {
  const {
    threadId,
    agreementId,
    modal,
    noChanges,
    onUpdate,
    onClose,
    onRefresh,
    upsert,
  } = ctx
  if (noChanges) {
    toast.error(
      submit ? 'No hay cambios para enviar.' : 'No hay cambios para guardar.',
    )
    return
  }
  if (submit) {
    const lastSent = modal.pay.evidence
    const lastSentNorm = normalizeEvidenceForCompare(
      lastSent?.lastSubmittedText ?? '',
      lastSent?.lastSubmittedAttachments ?? [],
    )
    const nowNorm = normalizeEvidenceForCompare(
      modal.text,
      modal.attachments,
    )
    if (
      lastSentNorm.text === nowNorm.text &&
      lastSentNorm.attsKey === nowNorm.attsKey
    ) {
      toast.error('No hay cambios desde la última evidencia enviada.')
      return
    }
  }
  onUpdate((m) => (m ? { ...m, busy: true } : m))
  try {
    await upsert({
      threadId,
      agreementId,
      paymentId: modal.pay.id,
      text: modal.text,
      attachments: modal.attachments,
      submit,
    })
    toast.success(submit ? 'Evidencia enviada.' : 'Evidencia guardada.')
    await onRefresh()
    onClose()
  } catch (e) {
    toast.error(
      (e as Error)?.message ??
        (submit
          ? 'No se pudo enviar la evidencia.'
          : 'No se pudo guardar la evidencia.'),
    )
  } finally {
    onUpdate((m) => (m ? { ...m, busy: false } : m))
  }
}

async function decideEvidence(
  decision: 'accept' | 'reject',
  ctx: {
    threadId: string
    agreementId: string
    modal: NonNullable<EvidenceModalState>
    onUpdate: Dispatch<SetStateAction<EvidenceModalState>>
    onClose: () => void
    onRefresh: () => Promise<unknown>
    decide: ReturnType<typeof useDecideServiceEvidenceMutation>['mutateAsync']
  },
) {
  const { threadId, agreementId, modal, onUpdate, onClose, onRefresh, decide } =
    ctx
  onUpdate((m) => (m ? { ...m, busy: true } : m))
  try {
    await decide({
      threadId,
      agreementId,
      paymentId: modal.pay.id,
      decision,
    })
    toast.success(
      decision === 'accept' ? 'Evidencia aceptada.' : 'Evidencia rechazada.',
    )
    await onRefresh()
    onClose()
  } catch (e) {
    toast.error(
      (e as Error)?.message ??
        (decision === 'accept'
          ? 'No se pudo aceptar la evidencia.'
          : 'No se pudo rechazar la evidencia.'),
    )
  } finally {
    onUpdate((m) => (m ? { ...m, busy: false } : m))
  }
}
