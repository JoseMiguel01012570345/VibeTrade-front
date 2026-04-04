import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { cn } from "../../../../../lib/cn";
import { onBackdropPointerClose } from "../../../lib/modalClose";
import type { ServiceScheduleState } from "../../../domain/tradeAgreementTypes";
import {
  coerceServiceSchedule,
  daysInCalendarMonth,
  defaultWeekdayCalendarDaysInMonth,
} from "../../../domain/tradeAgreementTypes";
import { modalShellWide } from "../../../styles/formModalStyles";

const MES: { n: number; l: string }[] = [
  { n: 1, l: "Ene" },
  { n: 2, l: "Feb" },
  { n: 3, l: "Mar" },
  { n: 4, l: "Abr" },
  { n: 5, l: "May" },
  { n: 6, l: "Jun" },
  { n: 7, l: "Jul" },
  { n: 8, l: "Ago" },
  { n: 9, l: "Sep" },
  { n: 10, l: "Oct" },
  { n: 11, l: "Nov" },
  { n: 12, l: "Dic" },
];

function shortWeekdayLabel(year: number, month: number, day: number): string {
  const js = new Date(year, month - 1, day).getDay();
  return ["Dom", "Lun", "Ma", "Mié", "Ju", "Vi", "Sá"][js];
}

function formatOverrideKey(key: string): string {
  const [mo, da] = key.split("-").map(Number);
  const ml = MES.find((x) => x.n === mo)?.l ?? String(mo);
  return `${ml} ${da}`;
}

/** Completa meses seleccionados sin días con lun–vie por defecto (evita bloquear «Siguiente»). */
function ensureDaysForSelectedMonths(
  s: ServiceScheduleState,
): ServiceScheduleState | undefined {
  const daysByMonth = { ...s.daysByMonth };
  for (const m of s.months) {
    if (!daysByMonth[m]?.length) {
      toast.error(
        "Ningún mes puede quedarse sin días seleccionados. Se asignarán días laborales por defecto.",
      );
      return undefined;
    }
  }
  return { ...s, daysByMonth } as ServiceScheduleState;
}

type Props = {
  open: boolean;
  value: ServiceScheduleState;
  onSave: (v: ServiceScheduleState) => void;
  onClose: () => void;
};

export function ServiceScheduleFlowModal({
  open,
  value,
  onSave,
  onClose,
}: Props) {
  const [sub, setSub] = useState(0);
  /** El padre remonta este modal al abrir (`key`) para hidratar siempre desde `value` guardado en el asistente. */
  const [st, setSt] = useState<ServiceScheduleState>(() =>
    coerceServiceSchedule(value),
  );

  const year = st.calendarYear;

  const [ovMonth, setOvMonth] = useState(1);
  const [ovDay, setOvDay] = useState(1);
  const [ovStart, setOvStart] = useState("09:00");
  const [ovEnd, setOvEnd] = useState("17:00");

  useEffect(() => {
    if (open && st.months.length) {
      const m = st.months.includes(ovMonth) ? ovMonth : st.months[0];
      setOvMonth(m);
      const dim = daysInCalendarMonth(m, year);
      setOvDay((d) => Math.min(d, dim));
    }
  }, [open, st.months, year, ovMonth]);

  const maxDayOv = daysInCalendarMonth(ovMonth, year);

  if (!open) return null;

  function toggleMonth(n: number) {
    setSt((prev) => {
      const y = prev.calendarYear;
      const has = prev.months.includes(n);
      const months = has
        ? prev.months.filter((m) => m !== n)
        : [...prev.months, n].sort((a, b) => a - b);
      const daysByMonth = { ...prev.daysByMonth };
      if (!has) {
        daysByMonth[n] = defaultWeekdayCalendarDaysInMonth(n, y);
      }
      return { ...prev, months, daysByMonth };
    });
  }

  function setCalendarYear(nextYear: number) {
    setSt((prev) => {
      const daysByMonth = { ...prev.daysByMonth };
      for (const m of prev.months) {
        daysByMonth[m] = defaultWeekdayCalendarDaysInMonth(m, nextYear);
      }
      return { ...prev, calendarYear: nextYear, daysByMonth };
    });
  }

  function toggleCalendarDay(m: number, day: number) {
    setSt((prev) => {
      const cur = new Set(prev.daysByMonth[m] ?? []);
      if (cur.has(day)) cur.delete(day);
      else cur.add(day);
      const next = Array.from(cur).sort((a, b) => a - b);
      return {
        ...prev,
        daysByMonth: { ...prev.daysByMonth, [m]: next },
      };
    });
  }

  function addOverride() {
    const key = `${ovMonth}-${ovDay}`;
    setSt((prev) => ({
      ...prev,
      dayHourOverrides: {
        ...prev.dayHourOverrides,
        [key]: { start: ovStart, end: ovEnd },
      },
    }));
  }

  function removeOverride(key: string) {
    setSt((prev) => {
      const next = { ...prev.dayHourOverrides };
      delete next[key];
      return { ...prev, dayHourOverrides: next };
    });
  }

  function finish() {
    if (!st.months.length) {
      toast.error("Elegí al menos un mes.");
      return;
    }
    const next = ensureDaysForSelectedMonths(st);
    if (!next) return;
    onSave(next);
    onClose();
  }

  return (
    <div
      className="vt-modal-backdrop z-[90]"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div className={modalShellWide}>
        <div className="vt-modal-title">Horarios y fechas del servicio</div>
        <p className="vt-muted mb-3 text-[13px]">
          Paso {sub + 1} de 3:{" "}
          {sub === 0
            ? "Meses"
            : sub === 1
              ? "Días del mes (calendario)"
              : "Horarios"}
        </p>

        {sub === 0 ? (
          <div className="flex flex-wrap gap-2">
            {MES.map(({ n, l }) => (
              <button
                key={n}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold",
                  st.months.includes(n)
                    ? "border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface))]"
                    : "border-[var(--border)] bg-[var(--surface)]",
                )}
                onClick={() => toggleMonth(n)}
              >
                {l}
              </button>
            ))}
          </div>
        ) : null}

        {sub === 1 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] px-3 py-2">
              <span className="text-xs font-bold text-[var(--muted)]">
                Año de referencia (calendario)
              </span>
              <select
                className="vt-input max-w-[120px] py-1.5 text-sm"
                value={year}
                onChange={(e) => setCalendarYear(Number(e.target.value))}
              >
                {Array.from(
                  { length: 7 },
                  (_, i) => new Date().getFullYear() - 2 + i,
                ).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-[var(--muted)]">
                Los días del mes dependen del año (feriados no se marcan
                automáticamente).
              </span>
            </div>
            <div className="max-h-[min(52vh,480px)] space-y-4 overflow-auto pr-1">
              {st.months.map((m) => {
                const dim = daysInCalendarMonth(m, year);
                const days = Array.from({ length: dim }, (_, i) => i + 1);
                return (
                  <div
                    key={m}
                    className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] p-3"
                  >
                    <div className="mb-2 text-xs font-extrabold">
                      {MES.find((x) => x.n === m)?.l}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {days.map((d) => {
                        const on = st.daysByMonth[m]?.includes(d);
                        const wd = shortWeekdayLabel(year, m, d);
                        return (
                          <button
                            key={d}
                            type="button"
                            title={`${d} (${wd})`}
                            className={cn(
                              "flex min-w-[2.5rem] flex-col items-center rounded-lg border px-1 py-1.5 text-[10px] font-bold leading-tight",
                              on
                                ? "border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface))] text-[var(--text)]"
                                : "border-[var(--border)] opacity-55",
                            )}
                            onClick={() => toggleCalendarDay(m, d)}
                          >
                            <span className="text-[11px]">{d}</span>
                            <span className="font-semibold text-[var(--muted)]">
                              {wd}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {sub === 2 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[var(--muted)]">
                  Desde (predeterminado)
                </span>
                <input
                  type="time"
                  className="vt-input"
                  value={st.defaultWindow.start}
                  onChange={(e) =>
                    setSt((p) => ({
                      ...p,
                      defaultWindow: {
                        ...p.defaultWindow,
                        start: e.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[var(--muted)]">
                  Hasta (predeterminado)
                </span>
                <input
                  type="time"
                  className="vt-input"
                  value={st.defaultWindow.end}
                  onChange={(e) =>
                    setSt((p) => ({
                      ...p,
                      defaultWindow: {
                        ...p.defaultWindow,
                        end: e.target.value,
                      },
                    }))
                  }
                />
              </label>
            </div>
            <p className="text-xs text-[var(--muted)]">
              El rango predeterminado aplica a todos los días habilitados. Podés
              definir una excepción por fecha concreta (mes + día del mes).
            </p>
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-[var(--border)] p-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[var(--muted)]">
                  Mes
                </span>
                <select
                  className="vt-input min-w-[100px]"
                  value={ovMonth}
                  onChange={(e) => setOvMonth(Number(e.target.value))}
                >
                  {st.months.map((m) => (
                    <option key={m} value={m}>
                      {MES.find((x) => x.n === m)?.l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[var(--muted)]">
                  Día del mes
                </span>
                <select
                  className="vt-input min-w-[72px]"
                  value={ovDay}
                  onChange={(e) => setOvDay(Number(e.target.value))}
                >
                  {Array.from({ length: maxDayOv }, (_, i) => i + 1).map(
                    (d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <input
                type="time"
                className="vt-input w-[120px]"
                value={ovStart}
                onChange={(e) => setOvStart(e.target.value)}
              />
              <input
                type="time"
                className="vt-input w-[120px]"
                value={ovEnd}
                onChange={(e) => setOvEnd(e.target.value)}
              />
              <button
                type="button"
                className="vt-btn vt-btn-sm"
                onClick={addOverride}
              >
                Aplicar horario
              </button>
            </div>
            <ul className="m-0 list-none space-y-1 p-0 text-sm">
              {Object.entries(st.dayHourOverrides).map(([key, v]) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg)] px-2 py-1.5"
                >
                  <span>
                    {formatOverrideKey(key)}: {v.start}–{v.end}
                  </span>
                  <button
                    type="button"
                    className="vt-btn vt-btn-ghost vt-btn-sm"
                    onClick={() => removeOverride(key)}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="vt-btn"
            onClick={() => (sub === 0 ? onClose() : setSub((s) => s - 1))}
          >
            {sub === 0 ? "Cancelar" : "Atrás"}
          </button>
          <div className="flex gap-2">
            {sub < 2 ? (
              <button
                type="button"
                className="vt-btn vt-btn-primary"
                disabled={sub === 0 && !st.months.length}
                onClick={() => {
                  if (sub === 0) {
                    setSt((p) => {
                      const dbm = { ...p.daysByMonth };
                      for (const m of p.months) {
                        if (!dbm[m]?.length)
                          dbm[m] = defaultWeekdayCalendarDaysInMonth(
                            m,
                            p.calendarYear,
                          );
                      }
                      return { ...p, daysByMonth: dbm };
                    });
                    setSub(1);
                    return;
                  }
                  if (sub === 1) {
                    if (!st.months.length) {
                      toast.error("Elegí al menos un mes.");
                      return;
                    }
                    const next = ensureDaysForSelectedMonths(st);
                    if (!next) return;
                    setSt(next);
                    setSub(2);
                  }
                }}
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                className="vt-btn vt-btn-primary"
                onClick={finish}
              >
                Guardar horarios
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
