import { useEffect, useState } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import type { MerchandiseLine, TradeAgreementDraft } from './tradeAgreementTypes'
import { defaultAgreementDraft, emptyMerchandiseLine } from './tradeAgreementTypes'
import type { TradeAgreementFormErrors } from './tradeAgreementValidation'
import {
  hasValidationErrors,
  validateTradeAgreementDraft,
  validationErrorCount,
} from './tradeAgreementValidation'

function Field({
  label,
  value,
  onChange,
  multiline,
  error,
  inputId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  error?: string
  inputId?: string
}) {
  const errId = inputId ? `${inputId}-err` : undefined
  return (
    <label
      className={clsx('vt-agr-field', error && 'vt-agr-field--invalid')}
    >
      <span className="vt-agr-field-label">{label}</span>
      {multiline ? (
        <textarea
          id={inputId}
          className="vt-input vt-agr-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
        />
      ) : (
        <input
          id={inputId}
          className="vt-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
        />
      )}
      {error ? (
        <span id={errId} className="vt-agr-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}

function LineEditor({
  line,
  onChange,
  onRemove,
  canRemove,
  lineIndex,
  errors,
}: {
  line: MerchandiseLine
  onChange: (next: MerchandiseLine) => void
  onRemove: () => void
  canRemove: boolean
  lineIndex: number
  errors?: Partial<Record<keyof MerchandiseLine, string>>
}) {
  const p = (k: keyof MerchandiseLine) => `agr-m-${lineIndex}-${k}`
  return (
    <div className="vt-agr-line">
      <div className="vt-agr-line-head">
        <span className="vt-agr-detail-sub">Línea de mercancía {lineIndex + 1}</span>
        {canRemove ? (
          <button type="button" className="vt-btn vt-btn-ghost" onClick={onRemove}>
            Quitar
          </button>
        ) : null}
      </div>
      <div className="vt-agr-line-grid">
        <Field
          label="Tipo"
          value={line.tipo}
          onChange={(v) => onChange({ ...line, tipo: v })}
          error={errors?.tipo}
          inputId={p('tipo')}
        />
        <Field
          label="Cantidad"
          value={line.cantidad}
          onChange={(v) => onChange({ ...line, cantidad: v })}
          error={errors?.cantidad}
          inputId={p('cantidad')}
        />
        <Field
          label="Valor unitario"
          value={line.valorUnitario}
          onChange={(v) => onChange({ ...line, valorUnitario: v })}
          error={errors?.valorUnitario}
          inputId={p('valorUnitario')}
        />
        <label className="vt-agr-field">
          <span className="vt-agr-field-label">Estado</span>
          <select
            id={p('estado')}
            className="vt-input"
            value={line.estado}
            onChange={(e) =>
              onChange({
                ...line,
                estado: e.target.value as MerchandiseLine['estado'],
              })
            }
          >
            <option value="nuevo">Nuevo</option>
            <option value="usado">Usado</option>
            <option value="reacondicionado">Reacondicionado</option>
          </select>
        </label>
        <Field
          label="Descuentos (número; 0 si no aplica)"
          value={line.descuento}
          onChange={(v) => onChange({ ...line, descuento: v })}
          error={errors?.descuento}
          inputId={p('descuento')}
        />
        <Field
          label="Impuestos (IVA, aranceles…)"
          value={line.impuestos}
          onChange={(v) => onChange({ ...line, impuestos: v })}
          error={errors?.impuestos}
          inputId={p('impuestos')}
          multiline
        />
      </div>
    </div>
  )
}

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

  const mm = draft.merchandiseMeta
  const sv = draft.service
  const me = errors.merchandiseMeta
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
      <div className="vt-modal vt-modal-wide vt-agr-modal">
        <div className="vt-modal-title">Emitir acuerdo de compra</div>
        <div className="vt-muted vt-agr-modal-sub">
          Emitido por <b>{storeName}</b>. El comprador podrá aceptar o rechazar. Todos los
          campos obligatorios deben completarse según el tipo de dato.
        </div>

        <div className="vt-modal-body vt-agr-form-body">
          <Field
            label="Título del acuerdo"
            value={draft.title}
            onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
            error={errors.title}
            inputId="agr-title"
          />

          {errors.scope ? (
            <div className="vt-agr-field-error" role="alert" style={{ marginBottom: 8 }}>
              {errors.scope}
            </div>
          ) : null}

          <div className="vt-agr-scope-row" aria-label="Qué incluye este acuerdo">
            <label className="vt-agr-check">
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
            <label className="vt-agr-check">
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

          <details open={draft.includeMerchandise} className="vt-agr-details">
            <summary>Mercancías</summary>
            {draft.includeMerchandise
              ? draft.merchandise.map((line, i) => (
                  <LineEditor
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

            {draft.includeMerchandise ? (
              <div className="vt-agr-block-spaced">
                <Field
                  label="Moneda"
                  value={mm.moneda}
                  onChange={(v) => setDraft((d) => ({ ...d, merchandiseMeta: { ...d.merchandiseMeta, moneda: v } }))}
                  error={me?.moneda}
                  inputId="agr-mm-moneda"
                />
                <Field
                  label="Tipo de embalaje"
                  value={mm.tipoEmbalaje}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      merchandiseMeta: { ...d.merchandiseMeta, tipoEmbalaje: v },
                    }))
                  }
                  error={me?.tipoEmbalaje}
                  inputId="agr-mm-embalaje"
                />
                <Field
                  label="Condiciones para devolver"
                  value={mm.devolucionesDesc}
                  multiline
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      merchandiseMeta: { ...d.merchandiseMeta, devolucionesDesc: v },
                    }))
                  }
                  error={me?.devolucionesDesc}
                  inputId="agr-mm-devol"
                />
                <Field
                  label="Quién paga el envío de devolución"
                  value={mm.devolucionQuienPaga}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      merchandiseMeta: { ...d.merchandiseMeta, devolucionQuienPaga: v },
                    }))
                  }
                  error={me?.devolucionQuienPaga}
                  inputId="agr-mm-quien"
                />
                <Field
                  label="Plazos (devolución)"
                  value={mm.devolucionPlazos}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      merchandiseMeta: { ...d.merchandiseMeta, devolucionPlazos: v },
                    }))
                  }
                  error={me?.devolucionPlazos}
                  inputId="agr-mm-plazos"
                />
                <Field
                  label="Regulaciones y cumplimiento (aduanas, restricciones, permisos)"
                  value={mm.regulaciones}
                  multiline
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      merchandiseMeta: { ...d.merchandiseMeta, regulaciones: v },
                    }))
                  }
                  error={me?.regulaciones}
                  inputId="agr-mm-reg"
                />
              </div>
            ) : null}
          </details>

          <details open={draft.includeService} className="vt-agr-details">
            <summary>Servicios</summary>
            {draft.includeService ? (
            <div className="vt-agr-line-grid">
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
