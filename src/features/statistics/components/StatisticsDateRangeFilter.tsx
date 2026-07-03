import { RefreshCw } from "lucide-react";
import {
  dateInputToIso,
  isoToDateInput,
  presetStatisticsRange,
  type StatisticsDateRange,
} from "../logic/statisticsRange";

export function StatisticsDateRangeFilter({
  range,
  onChange,
  deliveredOnly,
  onDeliveredOnlyChange,
  onRefresh,
}: {
  range: StatisticsDateRange;
  onChange: (r: StatisticsDateRange) => void;
  deliveredOnly: boolean;
  onDeliveredOnlyChange: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const presetBtn =
    "rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]";
  const fieldWrap = "flex flex-col text-xs font-medium text-[var(--muted)]";
  const fieldInput =
    "mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm text-[var(--text)]";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-base font-semibold text-[var(--text)]">
          Intervalo de análisis
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Todos los gráficos y KPIs usan el mismo rango de fechas.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <button type="button" className={presetBtn} onClick={() => onChange(presetStatisticsRange("7d"))}>
          7 días
        </button>
        <button type="button" className={presetBtn} onClick={() => onChange(presetStatisticsRange("30d"))}>
          30 días
        </button>
        <button type="button" className={presetBtn} onClick={() => onChange(presetStatisticsRange("month"))}>
          Mes actual
        </button>

        <label className={fieldWrap}>
          Desde
          <input
            type="date"
            value={isoToDateInput(range.from)}
            onChange={(e) => onChange({ ...range, from: dateInputToIso(e.target.value, "start") })}
            className={fieldInput}
          />
        </label>
        <label className={fieldWrap}>
          Hasta
          <input
            type="date"
            value={isoToDateInput(range.to)}
            onChange={(e) => onChange({ ...range, to: dateInputToIso(e.target.value, "end") })}
            className={fieldInput}
          />
        </label>

        <label className="flex items-center gap-2 self-end pb-1 text-xs text-[var(--text)]">
          <input
            type="checkbox"
            checked={deliveredOnly}
            onChange={(e) => onDeliveredOnlyChange(e.target.checked)}
            className="rounded border-[var(--border)] text-[var(--primary)]"
          />
          Solo entregados (ventas)
        </label>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 self-end rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-white"
          onClick={onRefresh}
        >
          <RefreshCw size={13} aria-hidden /> Actualizar
        </button>
      </div>
    </div>
  );
}
