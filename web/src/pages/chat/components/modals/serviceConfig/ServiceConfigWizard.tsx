import { HelpCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { cn } from '../../../../../lib/cn'
import type { ServiceItem } from '../../../domain/tradeAgreementTypes'
import { validateVigenciaRange } from '../../../domain/serviceVigenciaDates'
import { validateServiceWizardAdvance } from '../../../domain/tradeAgreementValidation'
import { coerceServiceSchedule, emptyServiceItem } from '../../../domain/tradeAgreementTypes'
import { ModalFormField as Field } from '../ModalFormField'
import { modalFormBody, modalShellWide, modalSub } from '../../../styles/formModalStyles'
import { onBackdropPointerClose } from '../../../lib/modalClose'
import { formatPaymentSummary, formatScheduleSummary } from './serviceItemFormat'
import { ServiceScheduleReadView } from './ServiceScheduleReadView'
import { ServicePaymentRecurrenceModal } from './ServicePaymentRecurrenceModal'
import { ServiceScheduleFlowModal } from './ServiceScheduleFlowModal'
import { ServiceTimeModal } from './ServiceTimeModal'
import { StringListModal } from './StringListModal'

const STEPS = [
  'Tipo de servicio',
  'Vigencia',
  'Horarios y fechas',
  'Pagos recurrentes',
  'Alcance',
  'Riesgos y dependencias',
  'Garantías y penalidades',
  'Condiciones comerciales',
] as const

const METODOS = ['Transferencia', 'Efectivo', 'Tarjeta', 'Mercado Pago', 'Otro']
const MONEDAS = ['ARS', 'USD', 'EUR', 'Otro']

type Props = {
  open: boolean
  initial: ServiceItem
  onSave: (item: ServiceItem) => void
  onClose: () => void
}

export function ServiceConfigWizard({ open, initial, onSave, onClose }: Props) {
  const [sv, setSv] = useState<ServiceItem>(emptyServiceItem())
  const [step, setStep] = useState(0)
  const [timeOpen, setTimeOpen] = useState(false)
  const [schedOpen, setSchedOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [listKind, setListKind] = useState<'riesgos' | 'dependencias' | 'causas' | null>(null)
  /** Solo al abrir: si dependemos de `initial` en cada cambio de referencia, se pierde el estado al re-renderizar el padre. */
  const wizardOpenRef = useRef(false)

  useEffect(() => {
    if (!open) {
      wizardOpenRef.current = false
      return
    }
    if (!wizardOpenRef.current) {
      const copy = JSON.parse(JSON.stringify(initial)) as ServiceItem
      copy.horarios = coerceServiceSchedule(copy.horarios)
      setSv(copy)
      setStep(0)
      wizardOpenRef.current = true
    }
  }, [open, initial])

  if (!open) return null

  function next() {
    if (step === 0) {
      if (sv.tipoServicio.trim().length < 2) {
        toast.error('Indicá el tipo de servicio (mín. 2 caracteres).')
        return
      }
    }
    if (step === 1) {
      if (!sv.tiempo.startDate.trim()) {
        toast.error('Definí la fecha de inicio del servicio (botón «Definir fechas»).')
        return
      }
      const ve = validateVigenciaRange(sv.tiempo.startDate, sv.tiempo.endDate)
      if (ve.length) {
        toast.error(ve[0])
        return
      }
    }
    if (step >= 2 && step <= 6) {
      const blockers = validateServiceWizardAdvance(sv, step)
      if (blockers.length) {
        toast.error(blockers[0])
        return
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function finish() {
    if (!sv.metodoPago.trim() || !sv.moneda.trim()) {
      toast.error('Completá método de pago y moneda.')
      return
    }
    if (!sv.medicionCumplimiento.trim() || !sv.penalIncumplimiento.trim()) {
      toast.error('Completá medición del cumplimiento y penalizaciones por incumplimiento.')
      return
    }
    if (!sv.nivelResponsabilidad.trim() || !sv.propIntelectual.trim()) {
      toast.error('Completá nivel de responsabilidad y propiedad intelectual.')
      return
    }
    onSave({ ...sv, configured: true })
    onClose()
  }

  const listItems =
    listKind === 'riesgos'
      ? sv.riesgos.items
      : listKind === 'dependencias'
        ? sv.dependencias.items
        : listKind === 'causas'
          ? sv.terminacion.causas
          : []

  return (
    <div
      className="vt-modal-backdrop z-[85]"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div className={modalShellWide}>
        <div className="vt-modal-title">Configurar servicio</div>
        <div className={modalSub}>
          Paso {step + 1} de {STEPS.length}: <b>{STEPS[step]}</b>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                'h-2 w-6 rounded-full transition-colors',
                i === step ? 'bg-[var(--primary)]' : 'bg-[color-mix(in_oklab,var(--border)_90%,transparent)]',
              )}
              aria-label={`Ir al paso ${i + 1}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className={modalFormBody}>
          {step === 0 ? (
            <Field
              label="Tipo de servicio"
              value={sv.tipoServicio}
              onChange={(v) => setSv((s) => ({ ...s, tipoServicio: v }))}
              inputId="wiz-sv-tipo"
            />
          ) : null}

          {step === 1 ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted)]">
                Fechas del período en que se presta el servicio. La fecha de inicio es obligatoria; la de fin
                no puede ser anterior a la de inicio.
              </p>
              <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_90%,transparent)] p-3 text-sm">
                <div className="font-bold">Resumen</div>
                <div className="mt-1 text-[var(--muted)]">
                  {sv.tiempo.startDate
                    ? sv.tiempo.endDate
                      ? `${sv.tiempo.startDate} → ${sv.tiempo.endDate}`
                      : `Desde ${sv.tiempo.startDate}`
                    : 'Aún no definiste fechas.'}
                </div>
              </div>
              <button type="button" className="vt-btn" onClick={() => setTimeOpen(true)}>
                Definir fechas
              </button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted)]">
                Meses con servicio, días del mes en la grilla y franja horaria base (9:00–17:00 por defecto).
                Podés agregar excepciones por fecha.
              </p>
              <div
                className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_90%,transparent)] p-3 sm:p-4"
                title={formatScheduleSummary(sv.horarios)}
              >
                <ServiceScheduleReadView horarios={sv.horarios} dense />
              </div>
              <button type="button" className="vt-btn" onClick={() => setSchedOpen(true)}>
                Configurar horarios y fechas
              </button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted)]">
                Meses en los que hay pagos y, para cada fila, día del mes y monto.
              </p>
              <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_90%,transparent)] p-3 text-sm">
                {formatPaymentSummary(sv)}
              </div>
              <button type="button" className="vt-btn" onClick={() => setPayOpen(true)}>
                Configurar recurrencia de pagos
              </button>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2">
              <Field
                label="Descripción del servicio"
                value={sv.descripcion}
                multiline
                onChange={(v) => setSv((s) => ({ ...s, descripcion: v }))}
                inputId="wiz-desc"
                rows={4}
              />
              <Field
                label="Qué incluye el servicio"
                value={sv.incluye}
                multiline
                onChange={(v) => setSv((s) => ({ ...s, incluye: v }))}
                inputId="wiz-inc"
                rows={3}
              />
              <Field
                label="Qué no incluye (opcional)"
                value={sv.noIncluye}
                multiline
                onChange={(v) => setSv((s) => ({ ...s, noIncluye: v }))}
                inputId="wiz-noinc"
                rows={3}
              />
              <Field
                label="Qué se entrega"
                value={sv.entregables}
                multiline
                onChange={(v) => setSv((s) => ({ ...s, entregables: v }))}
                inputId="wiz-ent"
                rows={3}
              />
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-5">
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={sv.riesgos.enabled}
                    onChange={(e) => setSv((s) => ({ ...s, riesgos: { ...s.riesgos, enabled: e.target.checked } }))}
                  />
                  Declarar riesgos del servicio
                </label>
                {sv.riesgos.enabled ? (
                  <div className="mt-2">
                    <button type="button" className="vt-btn vt-btn-sm" onClick={() => setListKind('riesgos')}>
                      Editar lista de riesgos
                    </button>
                    {sv.riesgos.items.length ? (
                      <p className="vt-muted mt-2 text-xs">{sv.riesgos.items.length} ítem(es)</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="vt-muted mt-1 text-xs">Desactivado: no se exigen riesgos en el acuerdo.</p>
                )}
              </div>
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={sv.dependencias.enabled}
                    onChange={(e) =>
                      setSv((s) => ({
                        ...s,
                        dependencias: { ...s.dependencias, enabled: e.target.checked },
                      }))
                    }
                  />
                  Declarar dependencias
                </label>
                {sv.dependencias.enabled ? (
                  <div className="mt-2">
                    <button type="button" className="vt-btn vt-btn-sm" onClick={() => setListKind('dependencias')}>
                      Editar lista de dependencias
                    </button>
                    {sv.dependencias.items.length ? (
                      <p className="vt-muted mt-2 text-xs">{sv.dependencias.items.length} ítem(es)</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="vt-muted mt-1 text-xs">Desactivado: no se exigen dependencias.</p>
                )}
              </div>
            </div>
          ) : null}

          {step === 6 ? (
            <div className="space-y-5">
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={sv.garantias.enabled}
                    onChange={(e) =>
                      setSv((s) => ({ ...s, garantias: { ...s.garantias, enabled: e.target.checked } }))
                    }
                  />
                  Ofrecer garantías
                </label>
                {sv.garantias.enabled ? (
                  <Field
                    label="Texto de garantías"
                    value={sv.garantias.texto}
                    multiline
                    onChange={(v) => setSv((s) => ({ ...s, garantias: { ...s.garantias, texto: v } }))}
                    inputId="wiz-gar"
                    rows={3}
                  />
                ) : null}
              </div>
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={sv.penalAtraso.enabled}
                    onChange={(e) =>
                      setSv((s) => ({ ...s, penalAtraso: { ...s.penalAtraso, enabled: e.target.checked } }))
                    }
                  />
                  Penalizaciones por atraso (dinero o bien)
                </label>
                {sv.penalAtraso.enabled ? (
                  <Field
                    label="Descripción"
                    value={sv.penalAtraso.texto}
                    multiline
                    onChange={(v) => setSv((s) => ({ ...s, penalAtraso: { ...s.penalAtraso, texto: v } }))}
                    inputId="wiz-pen-at"
                    rows={3}
                  />
                ) : null}
              </div>
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={sv.terminacion.enabled}
                    onChange={(e) =>
                      setSv((s) => ({
                        ...s,
                        terminacion: { ...s.terminacion, enabled: e.target.checked },
                      }))
                    }
                  />
                  Causas de terminación anticipada y aviso previo
                </label>
                {sv.terminacion.enabled ? (
                  <div className="mt-2 space-y-3">
                    <button type="button" className="vt-btn vt-btn-sm" onClick={() => setListKind('causas')}>
                      Editar causas
                    </button>
                    <Field
                      label="Periodo de aviso (ej. 30 días)"
                      value={sv.terminacion.avisoDias}
                      onChange={(v) => setSv((s) => ({ ...s, terminacion: { ...s.terminacion, avisoDias: v } }))}
                      inputId="wiz-aviso"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 7 ? (
            <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[var(--muted)]">Método de pago</span>
                <select
                  className="vt-input"
                  value={sv.metodoPago}
                  onChange={(e) => setSv((s) => ({ ...s, metodoPago: e.target.value }))}
                >
                  <option value="">Seleccionar…</option>
                  {METODOS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[var(--muted)]">Moneda</span>
                <select
                  className="vt-input"
                  value={sv.moneda}
                  onChange={(e) => setSv((s) => ({ ...s, moneda: e.target.value }))}
                >
                  <option value="">Seleccionar…</option>
                  {MONEDAS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <div className="min-[560px]:col-span-2">
                <Field
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      Cómo se mide el cumplimiento
                      <button
                        type="button"
                        className="inline-flex rounded p-0.5 text-[var(--muted)] hover:text-[var(--text)]"
                        title="Criterios objetivos o entregables que permiten verificar que el servicio se cumplió según lo pactado."
                      >
                        <HelpCircle size={15} aria-hidden />
                      </button>
                    </span>
                  }
                  value={sv.medicionCumplimiento}
                  multiline
                  onChange={(v) => setSv((s) => ({ ...s, medicionCumplimiento: v }))}
                  inputId="wiz-med"
                  rows={3}
                />
              </div>
              <Field
                label="Penalizaciones por incumplimiento"
                value={sv.penalIncumplimiento}
                multiline
                onChange={(v) => setSv((s) => ({ ...s, penalIncumplimiento: v }))}
                inputId="wiz-peninc"
                rows={3}
              />
              <div className="min-[560px]:col-span-2">
                <Field
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      Nivel de responsabilidad
                      <button
                        type="button"
                        className="inline-flex rounded p-0.5 text-[var(--muted)] hover:text-[var(--text)]"
                        title="Qué obligaciones asume cada parte ante fallas, daños o incumplimientos (p. ej. límite de responsabilidad)."
                      >
                        <HelpCircle size={15} aria-hidden />
                      </button>
                    </span>
                  }
                  value={sv.nivelResponsabilidad}
                  multiline
                  onChange={(v) => setSv((s) => ({ ...s, nivelResponsabilidad: v }))}
                  inputId="wiz-nivel"
                  rows={3}
                />
              </div>
              <div className="min-[560px]:col-span-2">
                <Field
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      Propiedad intelectual (dueño del resultado, reutilización, licencias)
                      <button
                        type="button"
                        className="inline-flex rounded p-0.5 text-[var(--muted)] hover:text-[var(--text)]"
                        title="Quién conserva derechos sobre entregables, si pueden reutilizarse y bajo qué licencias."
                      >
                        <HelpCircle size={15} aria-hidden />
                      </button>
                    </span>
                  }
                  value={sv.propIntelectual}
                  multiline
                  onChange={(v) => setSv((s) => ({ ...s, propIntelectual: v }))}
                  inputId="wiz-pi"
                  rows={3}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="vt-modal-actions border-t border-[var(--border)] pt-3">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <div className="flex flex-wrap gap-2">
            {step > 0 ? (
              <button type="button" className="vt-btn" onClick={prev}>
                Atrás
              </button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <button type="button" className="vt-btn vt-btn-primary" onClick={next}>
                Siguiente
              </button>
            ) : (
              <button type="button" className="vt-btn vt-btn-primary" onClick={finish}>
                Guardar configuración
              </button>
            )}
          </div>
        </div>
      </div>

      <ServiceTimeModal
        open={timeOpen}
        startDate={sv.tiempo.startDate}
        endDate={sv.tiempo.endDate}
        onClose={() => setTimeOpen(false)}
        onSave={(start, end) => setSv((s) => ({ ...s, tiempo: { startDate: start, endDate: end } }))}
      />
      {schedOpen ? (
        <ServiceScheduleFlowModal
          open
          value={sv.horarios}
          onClose={() => setSchedOpen(false)}
          onSave={(h) => setSv((s) => ({ ...s, horarios: h }))}
        />
      ) : null}
      <ServicePaymentRecurrenceModal
        open={payOpen}
        value={sv.recurrenciaPagos}
        onClose={() => setPayOpen(false)}
        onSave={(r) => setSv((s) => ({ ...s, recurrenciaPagos: r }))}
      />
      <StringListModal
        open={listKind !== null}
        title={
          listKind === 'riesgos'
            ? 'Riesgos del servicio'
            : listKind === 'dependencias'
              ? 'Dependencias'
              : 'Causas de terminación anticipada'
        }
        items={listItems}
        onClose={() => setListKind(null)}
        onSave={(items) => {
          if (listKind === 'riesgos') setSv((s) => ({ ...s, riesgos: { ...s.riesgos, items } }))
          else if (listKind === 'dependencias')
            setSv((s) => ({ ...s, dependencias: { ...s.dependencias, items } }))
          else if (listKind === 'causas')
            setSv((s) => ({ ...s, terminacion: { ...s.terminacion, causas: items } }))
        }}
      />
    </div>
  )
}
