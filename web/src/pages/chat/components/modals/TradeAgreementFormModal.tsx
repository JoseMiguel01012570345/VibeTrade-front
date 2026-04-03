import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { cn } from '../../../../lib/cn'
import {
  checkRow,
  detailsBlock,
  fieldError,
  lineGrid,
  modalFormBody,
  modalShellWide,
  modalSub,
  scopeRow,
} from '../../styles/formModalStyles'
import { MerchandiseLineEditor } from './MerchandiseLineEditor'
import { ModalFormField as Field } from './ModalFormField'
import type { MerchandiseLine, TradeAgreementDraft } from '../../domain/tradeAgreementTypes'
import { defaultAgreementDraft, emptyMerchandiseLine } from '../../domain/tradeAgreementTypes'
import type { TradeAgreementFormErrors } from '../../domain/tradeAgreementValidation'
import {
  hasValidationErrors,
  validateTradeAgreementDraft,
  validationErrorCount,
} from '../../domain/tradeAgreementValidation'

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (draft: TradeAgreementDraft) => void
  storeName: string
}

export function TradeAgreementFormModal({
  open,
  onClose,
  onSubmit,
  storeName,
}: Props) {
  const [draft, setDraft] = useState<TradeAgreementDraft>(() => defaultAgreementDraft())
  const [errors, setErrors] = useState<TradeAgreementFormErrors>({})

  useEffect(() => {
    if (open) {
      setDraft(defaultAgreementDraft())
      setErrors({})
    }
  }, [open])

  if (!open) return null

  const sv = draft.service
  const se = errors.service

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

  function trySubmit() {
    const e = validateTradeAgreementDraft(draft)
    setErrors(e)
    if (hasValidationErrors(e)) {
      const n = validationErrorCount(e)
      toast.error(`Revisá el formulario (${n} error${n === 1 ? '' : 'es'})`)
      return
    }
    onSubmit(draft)
    onClose()
  }

  return (
    <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
      <div className={modalShellWide}>
        <div className="vt-modal-title">Emitir acuerdo de compra</div>
        <div className={modalSub}>
          Emitido por <b>{storeName}</b>. El comprador podrá aceptar o rechazar. Todos los
          campos obligatorios deben completarse según el tipo de dato.
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
            {draft.includeMerchandise
              ? draft.merchandise.map((line, i) => (
                  <MerchandiseLineEditor
                    key={`agr-line-${i}`}
                    lineIndex={i}
                    line={line}
                    errors={errors.merchandiseLines?.[i]}
                    onChange={(ln) => setMerchLine(i, ln)}
                    onRemove={() => removeLine(i)}
                    canRemove={draft.merchandise.length > 1}
                  />
                ))
              : (
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
            <div className={lineGrid}>
              <Field label="Tipo de servicio" value={sv.tipoServicio} onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, tipoServicio: v } }))} error={se?.tipoServicio} inputId="agr-sv-tipo" />
              <Field
                label="Tiempo del servicio (inicio / fin)"
                value={sv.tiempoInicioFin}
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, tiempoInicioFin: v } }))}
                error={se?.tiempoInicioFin}
                inputId="agr-sv-tiempo"
              />
              <Field
                label="Horarios y fechas"
                value={sv.horariosFechas}
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, horariosFechas: v } }))}
                error={se?.horariosFechas}
                inputId="agr-sv-hor"
              />
              <Field
                label="Recurrencia de pagos (fechas y monto)"
                value={sv.recurrenciaPagos}
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, recurrenciaPagos: v } }))}
                error={se?.recurrenciaPagos}
                inputId="agr-sv-rec"
              />
              <Field
                label="Descripción del servicio"
                value={sv.descripcion}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, descripcion: v } }))}
                error={se?.descripcion}
                inputId="agr-sv-desc"
              />
              <Field
                label="Riesgos del servicio (lista, una línea por ítem)"
                value={sv.riesgos}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, riesgos: v } }))}
                error={se?.riesgos}
                inputId="agr-sv-ries"
              />
              <Field
                label="Qué incluye"
                value={sv.incluye}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, incluye: v } }))}
                error={se?.incluye}
                inputId="agr-sv-inc"
              />
              <Field
                label="Qué no incluye"
                value={sv.noIncluye}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, noIncluye: v } }))}
                error={se?.noIncluye}
                inputId="agr-sv-noinc"
              />
              <Field
                label="Dependencias (lista, una línea por ítem)"
                value={sv.dependencias}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, dependencias: v } }))}
                error={se?.dependencias}
                inputId="agr-sv-dep"
              />
              <Field
                label="Qué se entrega"
                value={sv.entregables}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, entregables: v } }))}
                error={se?.entregables}
                inputId="agr-sv-ent"
              />
              <Field
                label="Garantías"
                value={sv.garantias}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, garantias: v } }))}
                error={se?.garantias}
                inputId="agr-sv-gar"
              />
              <Field
                label="Penalizaciones por atraso"
                value={sv.penalAtraso}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, penalAtraso: v } }))}
                error={se?.penalAtraso}
                inputId="agr-sv-pena"
              />
              <Field
                label="Causas de terminación anticipada"
                value={sv.terminacionAnticipada}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, terminacionAnticipada: v } }))}
                error={se?.terminacionAnticipada}
                inputId="agr-sv-term"
              />
              <Field
                label="Periodo de aviso (ej. 30 días)"
                value={sv.avisoDias}
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, avisoDias: v } }))}
                error={se?.avisoDias}
                inputId="agr-sv-aviso"
              />
              <Field
                label="Método de pago"
                value={sv.metodoPago}
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, metodoPago: v } }))}
                error={se?.metodoPago}
                inputId="agr-sv-pago"
              />
              <Field
                label="Moneda"
                value={sv.moneda}
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, moneda: v } }))}
                error={se?.moneda}
                inputId="agr-sv-moneda"
              />
              <Field
                label="Cómo se mide el cumplimiento"
                value={sv.medicionCumplimiento}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, medicionCumplimiento: v } }))}
                error={se?.medicionCumplimiento}
                inputId="agr-sv-med"
              />
              <Field
                label="Penalizaciones por incumplimiento"
                value={sv.penalIncumplimiento}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, penalIncumplimiento: v } }))}
                error={se?.penalIncumplimiento}
                inputId="agr-sv-peninc"
              />
              <Field
                label="Nivel de responsabilidad"
                value={sv.nivelResponsabilidad}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, nivelResponsabilidad: v } }))}
                error={se?.nivelResponsabilidad}
                inputId="agr-sv-nivel"
              />
              <Field
                label="Propiedad intelectual / reutilización / licencias"
                value={sv.propIntelectual}
                multiline
                onChange={(v) => setDraft((d) => ({ ...d, service: { ...d.service, propIntelectual: v } }))}
                error={se?.propIntelectual}
                inputId="agr-sv-pi"
              />
            </div>
            ) : (
              <p className="vt-muted" style={{ fontSize: 13 }}>
                Marcá «Incluir servicios» para completar el bloque de servicio.
              </p>
            )}
          </details>
        </div>

        <div className="vt-modal-actions">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="vt-btn vt-btn-primary" onClick={trySubmit}>
            Emitir acuerdo
          </button>
        </div>
      </div>
    </div>
  )
}
