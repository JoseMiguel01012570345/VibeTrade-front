import type { ServiceItem, ServiceScheduleState } from '../../../domain/tradeAgreementTypes'
import { coerceServiceSchedule } from '../../../domain/tradeAgreementTypes'

const MES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const

export function formatScheduleSummary(h: ServiceScheduleState): string {
  const x = coerceServiceSchedule(h)
  const y = x.calendarYear
  const meses = x.months.length === 12 ? 'Todo el año' : x.months.map((m) => MES[m]).join(', ')
  const parts: string[] = [`Calendario ${y}`, meses]
  for (const m of x.months) {
    const days = x.daysByMonth[m]
    if (!days?.length) continue
    const label = MES[m]
    const sample =
      days.length <= 12 ? days.join(', ') : `${days.slice(0, 10).join(', ')}… (+${days.length - 10})`
    parts.push(`${label}: ${days.length} día(s): ${sample}`)
  }
  parts.push(`Horario base: ${x.defaultWindow.start}–${x.defaultWindow.end}`)
  const ov = Object.keys(x.dayHourOverrides)
  if (ov.length) parts.push(`${ov.length} excepción(es) de horario`)
  return parts.join(' · ')
}

export function formatPaymentSummary(sv: ServiceItem): string {
  const n = sv.recurrenciaPagos.entries.length
  const meses =
    sv.recurrenciaPagos.months.length === 12
      ? 'todos los meses'
      : `${sv.recurrenciaPagos.months.length} mes(es)`
  return `${n} fila(s) de pago · ${meses}`
}

export function serviceItemSummaryLine(sv: ServiceItem): string {
  const t = sv.tipoServicio.trim() || 'Servicio sin título'
  return sv.configured ? `✓ ${t}` : t
}
