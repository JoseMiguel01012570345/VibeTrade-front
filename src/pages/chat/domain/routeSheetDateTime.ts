/** Valor persistido: fecha y hora locales como `YYYY-MM-DDTHH:mm`. */
export const ROUTE_ESTIMADO_ISO_LOCAL_RE =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/

/** Solo fecha en el formulario (antes de elegir hora). */
const ROUTE_ESTIMADO_DATE_ONLY_RE = /^(\d{4}-\d{2}-\d{2})$/

/** Solo hora en el formulario (antes de elegir fecha): prefijo `T` para no colisionar con legado. */
const ROUTE_ESTIMADO_TIME_ONLY_RE = /^T(\d{2}:\d{2})$/

/** Datos antiguos: solo horas numéricas (decimal). */
const LEGACY_HOURS_ONLY_RE = /^\d+([.,]\d+)?$/

export function splitRouteEstimadoStored(raw: string | undefined): {
  date: string
  time: string
} {
  const t = (raw ?? '').trim()
  const m = t.match(ROUTE_ESTIMADO_ISO_LOCAL_RE)
  if (m) return { date: m[1]!, time: m[2]! }
  const dm = t.match(ROUTE_ESTIMADO_DATE_ONLY_RE)
  if (dm) return { date: dm[1]!, time: '' }
  const hm = t.match(ROUTE_ESTIMADO_TIME_ONLY_RE)
  if (hm) return { date: '', time: hm[1]! }
  if (LEGACY_HOURS_ONLY_RE.test(t)) return { date: '', time: '' }
  return { date: '', time: '' }
}

/** Une fecha/hora; permite incompletos en el UI hasta que existan ambos (`YYYY-MM-DD` o `THH:mm`). */
export function joinRouteEstimadoStored(date: string, time: string): string {
  const d = date.trim()
  const tm = time.trim()
  if (!d && !tm) return ''
  if (d && tm) return `${d}T${tm}`
  if (d) return d
  return `T${tm}`
}

/** Instantáneo en ms para comparar recogida vs entrega (solo valores ISO válidos). */
export function estimadoInstantMs(raw: string | undefined): number | null {
  const t = (raw ?? '').trim()
  const m = t.match(ROUTE_ESTIMADO_ISO_LOCAL_RE)
  if (!m) return null
  const dt = new Date(`${m[1]}T${m[2]}:00`)
  const ms = dt.getTime()
  return Number.isNaN(ms) ? null : ms
}

/** Fecha local `YYYY-MM-DD` del día en curso (para `min` en selectores). */
export function todayIsoDateLocal(): string {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/** Máximo léxico entre dos fechas ISO `YYYY-MM-DD` (vacío se ignora). */
export function maxIsoDate(a: string, b: string): string {
  const ta = a.trim()
  const tb = b.trim()
  if (!ta && !tb) return ''
  if (!ta) return tb
  if (!tb) return ta
  return ta >= tb ? ta : tb
}

/** Etiquetas en lista / modal; conserva texto legado si no es ISO. */
export function formatRouteEstimadoDisplay(raw: string | undefined): string {
  const t = (raw ?? '').trim()
  const m = t.match(ROUTE_ESTIMADO_ISO_LOCAL_RE)
  if (m) {
    const isoLocal = `${m[1]}T${m[2]}:00`
    const dt = new Date(isoLocal)
    if (Number.isNaN(dt.getTime())) return t
    try {
      return new Intl.DateTimeFormat('es', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dt)
    } catch {
      return t
    }
  }
  const dm = t.match(ROUTE_ESTIMADO_DATE_ONLY_RE)
  if (dm) {
    const [y, mo, d] = dm[1]!.split('-').map(Number)
    const dt = new Date(y, mo - 1, d)
    if (Number.isNaN(dt.getTime())) return t
    try {
      return new Intl.DateTimeFormat('es', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(dt)
    } catch {
      return t
    }
  }
  const hm = t.match(ROUTE_ESTIMADO_TIME_ONLY_RE)
  if (hm) {
    const [hh, mm] = hm[1]!.split(':').map(Number)
    const dt = new Date(2000, 0, 1, hh, mm, 0, 0)
    if (Number.isNaN(dt.getTime())) return t
    try {
      return new Intl.DateTimeFormat('es', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(dt)
    } catch {
      return t
    }
  }
  return t
}
