import type { MerchandiseLine, ServiceAgreementBlock, TradeAgreementDraft } from './tradeAgreementTypes'

type MerchandiseHolder = { merchandise: MerchandiseLine[] }

/** Errores por clave de campo plana o por índice de línea de mercancía. */
export type TradeAgreementFormErrors = {
  title?: string
  /** Alcance global: al menos mercancías o servicio; mercancías vacías con el flag activo. */
  scope?: string
  merchandiseLines?: Record<number, Partial<Record<keyof MerchandiseLine, string>>>
  service?: Partial<Record<keyof ServiceAgreementBlock, string>>
}

const TITLE_MIN = 3
const TITLE_MAX = 200
const SHORT_MAX = 500
const LONG_MAX = 8000
const TEXT_MIN = 2

function norm(s: string): string {
  return s.trim()
}

function isBlank(s: string): boolean {
  return norm(s) === ''
}

/** Acepta 123, 123.45, 123,45 y espacios. */
export function parseDecimal(raw: string): number | null {
  const t = norm(raw).replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return n
}

function requireDecimal(
  raw: string,
  label: string,
  opts: { min?: number; positive?: boolean; allowZero?: boolean },
): string | undefined {
  const t = norm(raw)
  if (t === '') return `${label}: valor requerido`
  const n = parseDecimal(t)
  if (n === null) return `${label}: ingresá un número válido`
  if (opts.positive && n <= 0) return `${label}: debe ser mayor que cero`
  if (!opts.allowZero && !opts.positive && n < 0) return `${label}: no puede ser negativo`
  if (opts.allowZero && n < 0) return `${label}: no puede ser negativo`
  if (opts.min !== undefined && n < opts.min) return `${label}: mínimo ${opts.min}`
  return undefined
}

function requireNonEmpty(raw: string, label: string, multiline = false): string | undefined {
  const t = norm(raw)
  if (t === '') return `${label} es obligatorio`
  if (t.length < TEXT_MIN) return `${label}: mínimo ${TEXT_MIN} caracteres`
  const max = multiline ? LONG_MAX : SHORT_MAX
  if (t.length > max) return `${label}: máximo ${max} caracteres`
  return undefined
}

function optionalTextMax(raw: string, label: string, multiline: boolean): string | undefined {
  const t = raw
  const max = multiline ? LONG_MAX : SHORT_MAX
  if (t.length > max) return `${label}: máximo ${max} caracteres`
  return undefined
}

/** Riesgos / dependencias: lista con al menos un ítem con sentido. */
function validateListField(raw: string, label: string): string | undefined {
  const err = requireNonEmpty(raw, label, true)
  if (err) return err
  const lines = norm(raw)
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 1) return `${label}: indicá al menos un punto (podés usar una línea por ítem)`
  const shortest = Math.min(...lines.map((l) => l.length))
  if (shortest < 2) return `${label}: cada ítem debería tener al menos 2 caracteres`
  return optionalTextMax(raw, label, true)
}

function validateAvisoDias(raw: string): string | undefined {
  const err = requireNonEmpty(raw, 'Periodo de aviso', false)
  if (err) return err
  const t = norm(raw)
  const num = parseInt(t.replace(/\D/g, ''), 10)
  if (!Number.isFinite(num) || num <= 0) {
    return 'Indicá un número de días (ej. 30)'
  }
  if (num > 3650) return 'Periodo de aviso demasiado alto (máx. 3650 días)'
  return optionalTextMax(raw, 'Periodo de aviso', false)
}

function lineIsActive(line: MerchandiseLine): boolean {
  return (
    !isBlank(line.tipo) ||
    !isBlank(line.cantidad) ||
    !isBlank(line.valorUnitario) ||
    !isBlank(line.descuento) ||
    !isBlank(line.impuestos) ||
    !isBlank(line.moneda) ||
    !isBlank(line.tipoEmbalaje) ||
    !isBlank(line.devolucionesDesc) ||
    !isBlank(line.devolucionQuienPaga) ||
    !isBlank(line.devolucionPlazos) ||
    !isBlank(line.regulaciones)
  )
}

export function hasMerchandise(d: MerchandiseHolder): boolean {
  return d.merchandise.some(lineIsActive)
}

/**
 * Validación completa según flow-ui: título, mercancías (cada línea con su bloque de condiciones),
 * servicios (todos los campos), hoja de ruta interna si hay mercancías.
 */
export function validateTradeAgreementDraft(d: TradeAgreementDraft): TradeAgreementFormErrors {
  const errors: TradeAgreementFormErrors = {}

  const title = norm(d.title)
  if (!title) errors.title = 'El título del acuerdo es obligatorio'
  else if (title.length < TITLE_MIN) errors.title = `El título debe tener al menos ${TITLE_MIN} caracteres`
  else if (title.length > TITLE_MAX) errors.title = `El título no puede superar ${TITLE_MAX} caracteres`

  if (!d.includeMerchandise && !d.includeService) {
    errors.scope = 'Debés incluir al menos mercancías o servicios (podés marcar ambos).'
  }

  if (d.includeMerchandise && !hasMerchandise(d)) {
    errors.scope =
      errors.scope ??
      'Con «Incluir mercancías» activado, completá al menos una línea con datos (tipo, cantidad, valor…).'
  }

  const lineErrors: NonNullable<TradeAgreementFormErrors['merchandiseLines']> = {}

  d.merchandise.forEach((line, i) => {
    if (!d.includeMerchandise || !lineIsActive(line)) return

    const le: Partial<Record<keyof MerchandiseLine, string>> = {}

    const tipoErr = requireNonEmpty(line.tipo, 'Tipo de mercancía', false)
    if (tipoErr) le.tipo = tipoErr

    const cantErr = requireDecimal(line.cantidad, 'Cantidad', { positive: true })
    if (cantErr) le.cantidad = cantErr

    const valErr = requireDecimal(line.valorUnitario, 'Valor unitario', { allowZero: true })
    if (valErr) le.valorUnitario = valErr

    const descRaw = norm(line.descuento)
    if (descRaw === '') {
      le.descuento = 'Indicá el descuento (0 si no aplica)'
    } else {
      const dErr = requireDecimal(line.descuento, 'Descuento', { allowZero: true })
      if (dErr) le.descuento = dErr
    }

    const impRaw = norm(line.impuestos)
    if (impRaw === '') {
      le.impuestos = 'Impuestos (IVA, aranceles…): indicá el cálculo o «0» si no aplica'
    } else if (impRaw.length < 2 && impRaw !== '0') {
      le.impuestos = 'Usá al menos 2 caracteres o «0» si no hay impuestos'
    } else {
      const om = optionalTextMax(line.impuestos, 'Impuestos', true)
      if (om) le.impuestos = om
    }

    ;(
      [
        ['moneda', 'Moneda'],
        ['tipoEmbalaje', 'Tipo de embalaje'],
        ['devolucionesDesc', 'Condiciones para devolver'],
        ['devolucionQuienPaga', 'Quién paga el envío de devolución'],
        ['devolucionPlazos', 'Plazos de devolución'],
        ['regulaciones', 'Regulaciones y cumplimiento'],
      ] as const
    ).forEach(([key, label]) => {
      const v = line[key]
      const e =
        key === 'regulaciones' || key === 'devolucionesDesc'
          ? requireNonEmpty(v, label, true)
          : requireNonEmpty(v, label, false)
      if (e) le[key] = e
      else {
        const om = optionalTextMax(v, label, key === 'regulaciones' || key === 'devolucionesDesc')
        if (om) le[key] = om
      }
    })

    if (Object.keys(le).length) lineErrors[i] = le
  })

  if (Object.keys(lineErrors).length) errors.merchandiseLines = lineErrors

  const sv = d.service
  const svErr: Partial<Record<keyof ServiceAgreementBlock, string>> = {}

  const serviceFields: { key: keyof ServiceAgreementBlock; label: string; multiline: boolean }[] = [
    { key: 'tipoServicio', label: 'Tipo de servicio', multiline: false },
    { key: 'tiempoInicioFin', label: 'Tiempo del servicio', multiline: false },
    { key: 'horariosFechas', label: 'Horarios y fechas', multiline: false },
    { key: 'recurrenciaPagos', label: 'Recurrencia de pagos', multiline: false },
    { key: 'descripcion', label: 'Descripción del servicio', multiline: true },
    { key: 'riesgos', label: 'Riesgos del servicio', multiline: true },
    { key: 'incluye', label: 'Qué incluye el servicio', multiline: true },
    { key: 'noIncluye', label: 'Qué no incluye', multiline: true },
    { key: 'dependencias', label: 'Dependencias', multiline: true },
    { key: 'entregables', label: 'Qué se entrega', multiline: true },
    { key: 'garantias', label: 'Garantías', multiline: true },
    { key: 'penalAtraso', label: 'Penalizaciones por atraso', multiline: true },
    { key: 'terminacionAnticipada', label: 'Causas de terminación anticipada', multiline: true },
    { key: 'avisoDias', label: 'Periodo de aviso', multiline: false },
    { key: 'metodoPago', label: 'Método de pago', multiline: false },
    { key: 'moneda', label: 'Moneda (servicio)', multiline: false },
    { key: 'medicionCumplimiento', label: 'Medición del cumplimiento', multiline: true },
    { key: 'penalIncumplimiento', label: 'Penalizaciones por incumplimiento', multiline: true },
    { key: 'nivelResponsabilidad', label: 'Nivel de responsabilidad', multiline: true },
    { key: 'propIntelectual', label: 'Propiedad intelectual y licencias', multiline: true },
  ]

  if (d.includeService) {
    serviceFields.forEach(({ key, label, multiline }) => {
      let e: string | undefined
      if (key === 'riesgos' || key === 'dependencias') {
        e = validateListField(sv[key], label)
      } else if (key === 'avisoDias') {
        e = validateAvisoDias(sv[key])
      } else {
        e = requireNonEmpty(sv[key], label, multiline)
        if (!e) e = optionalTextMax(sv[key], label, multiline)
      }
      if (e) svErr[key] = e
    })
  }

  if (Object.keys(svErr).length) errors.service = svErr

  return errors
}

export function validationErrorCount(e: TradeAgreementFormErrors): number {
  let n = 0
  if (e.title) n++
  if (e.scope) n++
  if (e.merchandiseLines) {
    Object.values(e.merchandiseLines).forEach((row) => {
      if (row) n += Object.keys(row).length
    })
  }
  if (e.service) n += Object.keys(e.service).length
  return n
}

export function hasValidationErrors(e: TradeAgreementFormErrors): boolean {
  return validationErrorCount(e) > 0
}
