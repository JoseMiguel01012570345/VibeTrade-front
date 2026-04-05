import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { cn } from '../../../../lib/cn'
import { onBackdropPointerClose } from '../../lib/modalClose'
import {
  checkRow,
  detailsBlock,
  fieldError,
  modalFormBody,
  modalShellWide,
  modalSub,
  scopeRow,
} from '../../styles/formModalStyles'
import { MerchandiseLineEditor } from './MerchandiseLineEditor'
import { ModalFormField as Field } from './ModalFormField'
import type { MerchandiseLine, TradeAgreementDraft } from '../../domain/tradeAgreementTypes'
import {
  defaultAgreementDraft,
  emptyMerchandiseLine,
  emptyServiceItem,
} from '../../domain/tradeAgreementTypes'
import type { TradeAgreementFormErrors } from '../../domain/tradeAgreementValidation'
import {
  hasValidationErrors,
  validateTradeAgreementDraft,
  validationErrorCount,
} from '../../domain/tradeAgreementValidation'
import type { StoreCatalog } from '../../domain/storeCatalogTypes'
import { mergeServiceItemWithStoreService } from '../../domain/storeCatalogTypes'
import { ServiceConfigWizard } from './serviceConfig/ServiceConfigWizard'
import { ServiceItemPreview } from './serviceConfig/ServiceItemPreview'
import { serviceItemSummaryLine } from './serviceConfig/serviceItemFormat'

type Props = {
  open: boolean
  onClose: () => void
  /** Devolvé `true` si el guardado/emisión fue exitoso (se cierra el modal). */
  onSubmit: (draft: TradeAgreementDraft) => boolean
  storeName: string
  /** Catálogo del vendedor (productos/servicios de ficha) para anclar líneas del acuerdo. */
  sellerCatalog?: StoreCatalog | null
  /** Modo edición: borrador desde acuerdo `pending_buyer` o `rejected` (al guardar, vuelve a pendiente). */
  initialDraft?: TradeAgreementDraft | null
  editingAgreementId?: string | null
}

export function TradeAgreementFormModal({
  open,
  onClose,
  onSubmit,
  storeName,
  sellerCatalog = null,
  initialDraft = null,
  editingAgreementId = null,
}: Props) {
  const [draft, setDraft] = useState<TradeAgreementDraft>(() => defaultAgreementDraft())
  const [errors, setErrors] = useState<TradeAgreementFormErrors>({})
  const [configOpen, setConfigOpen] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)
  const isEdit = !!editingAgreementId
  const editBaselineJsonRef = useRef<string | null>(null)

  useEffect(() => {
    if (open) {
      const d = initialDraft
        ? (JSON.parse(JSON.stringify(initialDraft)) as TradeAgreementDraft)
        : defaultAgreementDraft()
      setDraft(d)
      setErrors({})
      setConfigOpen(false)
      setConfigId(null)
      editBaselineJsonRef.current =
        editingAgreementId && initialDraft ? JSON.stringify(d) : null
    }
  }, [open, initialDraft, editingAgreementId])

  if (!open) return null

  const configItem = configId ? draft.services.find((s) => s.id === configId) : undefined

  function setMerchLine(i: number, line: MerchandiseLine) {
    setDraft((d) => {
      const next = [...d.merchandise]
      next[i] = line
      return { ...d, merchandise: next }
    })
  }

  function addLine() {
    setDraft((d) => ({ ...d, merchandise: [...d.merchandise, emptyMerchandiseLine()] }))
  }

  function removeLine(i: number) {
    setDraft((d) => ({
      ...d,
      merchandise: d.merchandise.filter((_, j) => j !== i),
    }))
  }

  function addService() {
    const item = emptyServiceItem()
    setDraft((d) => ({ ...d, services: [...d.services, item] }))
    setConfigId(item.id)
    setConfigOpen(true)
  }

  function removeService(id: string) {
    setDraft((d) => ({ ...d, services: d.services.filter((s) => s.id !== id) }))
    if (configId === id) {
      setConfigId(null)
      setConfigOpen(false)
    }
  }

  function openConfig(id: string) {
    setConfigId(id)
    setConfigOpen(true)
  }

  function trySubmit() {
    const e = validateTradeAgreementDraft(draft)
    setErrors(e)
    if (hasValidationErrors(e)) {
      const n = validationErrorCount(e)
      toast.error(`Revisá el formulario (${n} error${n === 1 ? '' : 'es'})`)
      return
    }
    if (isEdit && editBaselineJsonRef.current !== null) {
      if (JSON.stringify(draft) === editBaselineJsonRef.current) {
        toast.error('No hay cambios para guardar.')
        return
      }
    }
    if (onSubmit(draft)) onClose()
  }

  return (
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div className={modalShellWide}>
        <div className="vt-modal-title">
          {isEdit ? 'Editar acuerdo enviado' : 'Emitir acuerdo de compra'}
        </div>
        <div className={modalSub}>
          {isEdit ? (
            <>
              Podés guardar si el acuerdo está <b>pendiente</b> o fue <b>rechazado</b> (en ese caso volverá a
              quedar pendiente para el comprador). Si ya fue <b>aceptado</b>, no se puede modificar.
            </>
          ) : (
            <>
              Emitido por <b>{storeName}</b>. El comprador podrá aceptar o rechazar. Todos los campos
              obligatorios deben completarse según el tipo de dato.
            </>
          )}
        </div>

        <div className={modalFormBody}>
          <Field
            label="Título del acuerdo"
            value={draft.title}
            onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
            error={errors.title}
            inputId="agr-title"
          />

          {errors.scope ? (
            <div className={cn(fieldError, 'mb-2')} role="alert">
              {errors.scope}
            </div>
          ) : null}

          <div className={scopeRow} aria-label="Qué incluye este acuerdo">
            <label className={checkRow}>
              <input
                type="checkbox"
                checked={draft.includeMerchandise}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    includeMerchandise: e.target.checked,
                  }))
                }
              />
              <span>Incluir mercancías</span>
            </label>
            <label className={checkRow}>
              <input
                type="checkbox"
                checked={draft.includeService}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    includeService: e.target.checked,
                  }))
                }
              />
              <span>Incluir servicios</span>
            </label>
          </div>
          <p className="vt-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 12 }}>
            Al menos uno debe estar marcado. Solo se validan los bloques que incluyas.
          </p>

          <details open={draft.includeMerchandise} className={detailsBlock}>
            <summary>Mercancías</summary>
            {draft.includeMerchandise ? (
              draft.merchandise.map((line, i) => (
                <MerchandiseLineEditor
                  key={`agr-line-${i}`}
                  lineIndex={i}
                  line={line}
                  errors={errors.merchandiseLines?.[i]}
                  onChange={(ln) => setMerchLine(i, ln)}
                  onRemove={() => removeLine(i)}
                  canRemove={draft.merchandise.length > 1}
                  sellerCatalog={sellerCatalog}
                />
              ))
            ) : (
              <p className="vt-muted" style={{ fontSize: 13 }}>
                Marcá «Incluir mercancías» para completar líneas y logística.
              </p>
            )}
            {draft.includeMerchandise ? (
              <button type="button" className="vt-btn" onClick={addLine}>
                + Añadir tipo de mercancía
              </button>
            ) : null}
          </details>

          <details open={draft.includeService} className={detailsBlock}>
            <summary>Servicios</summary>
            {draft.includeService ? (
              <div className="flex flex-col gap-3">
                {errors.serviceItems ? (
                  <div className={fieldError} role="alert">
                    {errors.serviceItems}
                  </div>
                ) : null}

                {draft.services.map((sv, i) => (
                  <div
                    key={sv.id}
                    className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 font-extrabold tracking-[-0.02em]">
                        Servicio {i + 1}: {serviceItemSummaryLine(sv)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sellerCatalog?.services.length ? (
                          <label className="flex min-w-[200px] max-w-full flex-col gap-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                              Anclar a servicio del catálogo
                            </span>
                            <select
                              className="vt-input vt-btn-sm py-1.5"
                              value={sv.linkedStoreServiceId ?? ''}
                              onChange={(e) => {
                                const id = e.target.value
                                if (!id) {
                                  setDraft((d) => ({
                                    ...d,
                                    services: d.services.map((s) =>
                                      s.id === sv.id ? { ...s, linkedStoreServiceId: undefined } : s,
                                    ),
                                  }))
                                  return
                                }
                                const svc = sellerCatalog.services.find((x) => x.id === id)
                                if (!svc) return
                                setDraft((d) => ({
                                  ...d,
                                  services: d.services.map((s) =>
                                    s.id === sv.id ? mergeServiceItemWithStoreService(s, svc) : s,
                                  ),
                                }))
                              }}
                            >
                              <option value="">Sin anclar…</option>
                              {sellerCatalog.services.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.category} · {s.tipoServicio}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        <button type="button" className="vt-btn vt-btn-sm" onClick={() => openConfig(sv.id)}>
                          Configurar servicio
                        </button>
                        <button
                          type="button"
                          className="vt-btn vt-btn-ghost vt-btn-sm text-[var(--muted)]"
                          onClick={() => removeService(sv.id)}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                    {sv.configured ? (
                      <div className="mt-2 border-t border-[var(--border)] pt-3">
                        <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                          Vista previa
                        </div>
                        <ServiceItemPreview sv={sv} />
                      </div>
                    ) : (
                      <p className="vt-muted text-xs">
                        Usá «Configurar servicio» para completar el asistente y generar la vista previa.
                      </p>
                    )}
                  </div>
                ))}

                <button type="button" className="vt-btn" onClick={addService}>
                  + Añadir servicio
                </button>
              </div>
            ) : (
              <p className="vt-muted" style={{ fontSize: 13 }}>
                Marcá «Incluir servicios» para agregar y configurar servicios con el asistente.
              </p>
            )}
          </details>
        </div>

        <div className="vt-modal-actions">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="vt-btn vt-btn-primary" onClick={trySubmit}>
            {isEdit ? 'Guardar cambios' : 'Emitir acuerdo'}
          </button>
        </div>
      </div>

      {configItem ? (
        <ServiceConfigWizard
          open={configOpen && !!configItem}
          initial={configItem}
          onClose={() => {
            setConfigOpen(false)
            setConfigId(null)
          }}
          onSave={(item) => {
            setDraft((d) => ({
              ...d,
              services: d.services.map((s) => (s.id === item.id ? item : s)),
            }))
            setConfigOpen(false)
            setConfigId(null)
          }}
        />
      ) : null}
    </div>
  )
}
