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
