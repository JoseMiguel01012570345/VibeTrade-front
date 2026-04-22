/** Validación de fechas ISO `yyyy-mm-dd` para vigencia del servicio (zona local). */

export function parseLocalDateFromIso(iso: string): Date | null {
  const t = iso.trim()
  if (!t) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

function startOfToday(): Date {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

function maxAllowedDate(): Date {
  const m = startOfToday()
  m.setFullYear(m.getFullYear() + 50)
  return m
}

/** Fecha de fin de vigencia: la indicada o, si está vacía, tope 50 años (misma regla que validación). */
function effectiveVigenciaEndOrMax(start: Date, endIso: string): Date {
  if (!endIso.trim()) {
    return maxAllowedDate()
  }
  const t = parseLocalDateFromIso(endIso)
  return t && t >= start ? t : maxAllowedDate()
}

/**
 * Años calendario que tocan [inicio, fin] (fin abierta → 50 años).
 */
export function yearsTouchingVigencia(
  startIso: string,
  endIso: string,
): number[] {
  const a = parseLocalDateFromIso(startIso)
  if (!a) return []
  const b = effectiveVigenciaEndOrMax(a, endIso)
  if (b < a) return []
  const y0 = a.getFullYear()
  const y1 = b.getFullYear()
  const out: number[] = []
  for (let y = y0; y <= y1; y++) out.push(y)
  return out
}

/**
 * Meses (1–12) del `year` dado con al menos un día dentro de la vigencia.
 */
export function monthsOverlappingVigenciaInYear(
  startIso: string,
  endIso: string,
  year: number,
): number[] {
  const a = parseLocalDateFromIso(startIso)
  if (!a) return []
  const b = effectiveVigenciaEndOrMax(a, endIso)
  if (b < a) return []
  const out: number[] = []
  for (let m = 1; m <= 12; m++) {
    const first = new Date(year, m - 1, 1)
    const lastD = new Date(year, m, 0).getDate()
    const last = new Date(year, m - 1, lastD)
    if (last >= a && first <= b) out.push(m)
  }
  return out
}

/** [inicio, fin] local para cálculos (fin abierta → tope 50 años). */
export function vigenciaRangeBounds(
  startIso: string,
  endIso: string,
): { start: Date; end: Date } | null {
  const a = parseLocalDateFromIso(startIso)
  if (!a) return null
  const b = effectiveVigenciaEndOrMax(a, endIso)
  if (b < a) return null
  return { start: a, end: b }
}

/**
 * Indica si el día de calendario (mes 1–12, día 1–31) entra al menos una vez
 * en el intervalo de vigencia, probando **cada año** que toca [inicio, fin] (el modelo
 * de excepciones solo guarda `m-d` sin año).
 */
export function isCalendarMonthDayInVigencia(
  startIso: string,
  endIso: string,
  month1: number,
  day1: number,
): boolean {
  if (!Number.isInteger(month1) || month1 < 1 || month1 > 12) return false
  if (!Number.isInteger(day1) || day1 < 1 || day1 > 31) return false
  const vr = vigenciaRangeBounds(startIso, endIso)
  if (!vr) return false
  const ys = yearsTouchingVigencia(startIso, endIso)
  for (const y of ys) {
    const t = new Date(y, month1 - 1, day1)
    if (t.getFullYear() !== y || t.getMonth() !== month1 - 1 || t.getDate() !== day1) {
      continue
    }
    if (t >= vr.start && t <= vr.end) return true
  }
  return false
}

/**
 * Días del calendario (1–`dim`) del `year`+`month` que caen dentro de la vigencia.
 * Así, un solo día (p. ej. 2026-04-22 → 2026-04-22) produce solo [22] en abril.
 */
export function calendarDaysInMonthWithinVigencia(
  year: number,
  month1: number,
  startIso: string,
  endIso: string,
): number[] {
  const vr = vigenciaRangeBounds(startIso, endIso)
  if (!vr) return []
  const dim = new Date(year, month1, 0).getDate()
  const out: number[] = []
  for (let d = 1; d <= dim; d++) {
    const t = new Date(year, month1 - 1, d)
    if (t >= vr.start && t <= vr.end) out.push(d)
  }
  return out
}

export function validateVigenciaDate(
  iso: string,
  label: string,
  opts: { required?: boolean },
): string | undefined {
  if (!iso.trim()) return opts.required ? `${label} es obligatoria` : undefined
  const dt = parseLocalDateFromIso(iso)
  if (!dt) return `${label}: fecha inválida`
  const today = startOfToday()
  const max = maxAllowedDate()
  if (dt < today) return `${label}: no puede ser anterior a hoy`
  if (dt > max) return `${label}: no puede ser más de 50 años en el futuro`
  return undefined
}

export function validateVigenciaRange(start: string, end: string): string[] {
  const msgs: string[] = []
  const e1 = validateVigenciaDate(start, 'Fecha de inicio', { required: true })
  if (e1) msgs.push(e1)
  if (end.trim()) {
    const e2 = validateVigenciaDate(end, 'Fecha de fin', { required: false })
    if (e2) msgs.push(e2)
    const a = parseLocalDateFromIso(start)
    const b = parseLocalDateFromIso(end)
    if (a && b && b < a) msgs.push('La fecha de fin no puede ser anterior a la fecha de inicio')
  }
  return msgs
}
