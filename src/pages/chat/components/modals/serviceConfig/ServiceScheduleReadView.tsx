import { cn } from '../../../../../lib/cn'
import type { ServiceScheduleState } from '../../../domain/tradeAgreementTypes'
import { coerceServiceSchedule } from '../../../domain/tradeAgreementTypes'

const MES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const

const monthPillClass =
  'rounded-full border border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-2 py-0.5 text-[11px] font-bold text-[var(--text)]'

type Props = {
  horarios: ServiceScheduleState
  /** Área de días más baja (paso del asistente) */
  dense?: boolean
}

export function ServiceScheduleReadView({ horarios, dense }: Props) {
  const sched = coerceServiceSchedule(horarios)
  const nOv = Object.keys(sched.dayHourOverrides).length

  return (
    <div className={cn('space-y-3 text-[13px]', dense && 'text-[12px]')}>
      <div className="flex flex-col gap-2 border-b border-[color-mix(in_oklab,var(--border)_85%,transparent)] pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs font-extrabold tracking-tight text-[var(--text)]">
            Calendario {sched.calendarYear}
          </span>
          <span className="text-xs text-[var(--muted)]">
            Horario base{' '}
            <span className="font-semibold text-[var(--text)] tabular-nums">
              {sched.defaultWindow.start}–{sched.defaultWindow.end}
            </span>
          </span>
        </div>
        {nOv > 0 ? (
          <span className="text-[11px] font-semibold text-[var(--muted)]">{nOv} excepción(es)</span>
        ) : null}
      </div>

      <div>
        <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
          Meses con prestación
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sched.months.length === 12 ? (
            <span className={monthPillClass}>Todo el año</span>
          ) : (
            sched.months.map((m) => (
              <span key={m} className={monthPillClass}>
                {MES[m]}
              </span>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
          Días del mes en los que hay servicio
        </div>
        <div
          className={cn(
            'space-y-2 overflow-y-auto overscroll-y-contain rounded-lg border border-[color-mix(in_oklab,var(--border)_75%,transparent)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] p-2.5',
            dense ? 'max-h-[min(36vh,260px)]' : 'max-h-[min(48vh,380px)]',
          )}
        >
          {sched.months.map((m) => {
            const days = sched.daysByMonth[m] ?? []
            if (!days.length) return null
            return (
              <div
                key={m}
                className="rounded-md border border-[color-mix(in_oklab,var(--border)_55%,transparent)] bg-[color-mix(in_oklab,var(--surface)_82%,var(--bg))] px-2 py-1.5"
              >
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-1">
                  <span className="text-[11px] font-extrabold text-[var(--text)]">{MES[m]}</span>
                  <span className="text-[10px] font-semibold tabular-nums text-[var(--muted)]">
                    {days.length} día(s)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {days.map((d) => (
                    <span
                      key={d}
                      className="inline-flex min-w-[1.6rem] justify-center rounded border border-[color-mix(in_oklab,var(--primary)_22%,var(--border))] bg-[var(--surface)] px-1 py-0.5 text-[10px] font-bold tabular-nums text-[var(--text)]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {nOv > 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_90%,transparent)] px-2.5 py-2">
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            Excepciones de horario
          </div>
          <ul className="m-0 list-none space-y-1.5 p-0 text-xs leading-snug">
            {Object.entries(sched.dayHourOverrides).map(([key, v]) => {
              const [mo, da] = key.split('-').map(Number)
              return (
                <li key={key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-semibold text-[var(--text)]">
                    {MES[mo]} {da}
                  </span>
                  <span className="text-[var(--muted)]">{v.start}–{v.end}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
