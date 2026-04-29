import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { VtSelect, type VtSelectOption } from "../../../../../components/VtSelect";
import { VtTimeField } from "../../../../../components/VtTimeField";
import { cn } from "../../../../../lib/cn";
import { onBackdropPointerClose } from "../../../lib/modalClose";
import type { ServiceScheduleState } from "../../../domain/tradeAgreementTypes";
import {
  coerceServiceSchedule,
  daysInCalendarMonth,
  defaultWeekdayCalendarDaysInMonth,
} from "../../../domain/tradeAgreementTypes";
import {
  monthsInScheduleAndVigencia,
  daysForServiceMonthInSchedule,
} from "../../../domain/serviceScheduleMonthDayConstraints";
import {
  calendarDaysInMonthWithinVigencia,
  monthsOverlappingVigenciaInYear,
  yearsTouchingVigencia,
} from "../../../domain/serviceVigenciaDates";
import { modalShellWide } from "../../../styles/formModalStyles";

const STEP_TITLES = [
  "Meses",
  "Días del mes (calendario)",
  "Horarios",
] as const;

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

/** "HH:MM" 24h → minutos desde medianoche, o `null` si el formato no es válido. */
function timeStringToMinutes(hhmm: string): number | null {
  const t = hhmm.trim();
  if (!/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [a, b] = t.split(":");
  const h = Number(a);
  const m = Number(b);
  if (!Number.isInteger(h) || h < 0 || h > 23) return null;
  if (!Number.isInteger(m) || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Mismo día: el fin tiene que ser estrictamente posterior al inicio (no igual, no antes). */
function isEndStrictlyAfterStart(start: string, end: string): boolean {
  const a = timeStringToMinutes(start);
  const b = timeStringToMinutes(end);
  if (a === null || b === null) return false;
  return b > a;
}

const TOAST_HORARIO_FIN_TRAS_INICIO =
  "El horario de fin debe ser posterior al de inicio (no puede ser igual ni más temprano).";
const TOAST_EXC_MES =
  "Elige un mes que tenga servicio y entre en el período de vigencia del contrato.";
const TOAST_EXC_DIA =
  "Elige un día en el que el servicio esté habilitado en la grilla de ese mes (paso 2).";

/**
 * Ajusta `coerced` a la vigencia: año, meses permitidos y días/override coherentes.
 * Devuelve `null` si no hay rango de años o meses válido.
 */
function stateAfterVigenciaOpen(
  schedule: ServiceScheduleState,
  vigenciaStart: string,
  vigenciaEnd: string,
): ServiceScheduleState | null {
  const ys = yearsTouchingVigencia(vigenciaStart, vigenciaEnd);
  if (!ys.length) return null;
  const coerced = coerceServiceSchedule(schedule);
  let y = coerced.calendarYear;
  if (!ys.includes(y)) y = ys[0];
  const allowed = monthsOverlappingVigenciaInYear(
    vigenciaStart,
    vigenciaEnd,
    y,
  );
  if (!allowed.length) return null;
  const kept = coerced.months.filter((m) => allowed.includes(m));
  const baseMonths = kept.length > 0 ? kept : allowed;

  /** No filtrar por rango de vigencia: el usuario puede guardar p. ej. 1 de abril aunque el
   *  día no caiga en el tramo (la grilla puede ser 22–30) y al reabrir se debe seguir listando. */
  const dayHourOverrides: ServiceScheduleState["dayHourOverrides"] = {
    ...coerced.dayHourOverrides,
  };
  for (const k of Object.keys(dayHourOverrides)) {
    const [mo, da] = k.split("-").map(Number);
    if (!Number.isInteger(mo) || !Number.isInteger(da)) {
      delete dayHourOverrides[k];
    }
  }

  const monthSet = new Set<number>(baseMonths);
  for (const k of Object.keys(dayHourOverrides)) {
    const mo = Number(String(k).split("-")[0]);
    if (Number.isInteger(mo) && mo >= 1 && mo <= 12) {
      monthSet.add(mo);
    }
  }
  const months = Array.from(monthSet).sort((a, b) => a - b);

  const daysByMonth: Record<number, number[]> = {};
  for (const m of months) {
    const inVig = calendarDaysInMonthWithinVigencia(
      y,
      m,
      vigenciaStart,
      vigenciaEnd,
    );
    const existing = coerced.daysByMonth[m];
    if (existing?.length) {
      const pruned = existing.filter((d) => inVig.includes(d));
      daysByMonth[m] = pruned.length > 0 ? pruned : inVig;
    } else {
      daysByMonth[m] = inVig;
    }
  }
  return {
    ...coerced,
    calendarYear: y,
    months,
    daysByMonth,
    dayHourOverrides,
  };
}

function getHydratedSchedule(
  schedule: ServiceScheduleState,
  vigOn: boolean,
  vigenciaStart: string,
  vigenciaEnd: string,
): ServiceScheduleState {
  const coerced = coerceServiceSchedule(schedule);
  if (!vigOn) return coerced;
  return (
    stateAfterVigenciaOpen(schedule, vigenciaStart, vigenciaEnd) ?? coerced
  );
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

type Props = Readonly<{
  open: boolean;
  value: ServiceScheduleState;
  onSave: (v: ServiceScheduleState) => void;
  onClose: () => void;
  /** Vigencia del servicio (paso «tiempo»). Restringe meses a los que caen en el intervalo (y los preselecciona al abrir). */
  vigenciaStart?: string;
  vigenciaEnd?: string;
}>;

const DEFAULT_YEAR_WINDOW = 7;

export function ServiceScheduleFlowModal({
  open,
  value,
  onSave,
  onClose,
  vigenciaStart = "",
  vigenciaEnd = "",
}: Props) {
  const [sub, setSub] = useState(0);
  /** Cada apertura remonta el modal: el estado deriva de `value` (horarios guardados en el asistente). */
  const [st, setSt] = useState<ServiceScheduleState>(() =>
    getHydratedSchedule(value, Boolean(vigenciaStart.trim()), vigenciaStart, vigenciaEnd),
  );
  const stRef = useRef(st);
  stRef.current = st;

  const year = st.calendarYear;
  const vigOn = Boolean(vigenciaStart.trim());

  const yearList = useMemo(() => {
    if (vigOn) {
      const ys = yearsTouchingVigencia(vigenciaStart, vigenciaEnd);
      if (ys.length) return ys;
    }
    const cy = new Date().getFullYear();
    return Array.from(
      { length: DEFAULT_YEAR_WINDOW },
      (_, i) => cy - 2 + i,
    );
  }, [vigOn, vigenciaStart, vigenciaEnd]);

  const yearListResolved = useMemo(() => {
    if (yearList.includes(year)) return yearList;
    return [...yearList, year].sort((a, b) => a - b);
  }, [yearList, year]);

  const yearSelectOptions: VtSelectOption[] = useMemo(
    () => yearListResolved.map((y) => ({ value: String(y), label: String(y) })),
    [yearListResolved],
  );

  const allowedMonths = useMemo(() => {
    if (!vigOn) return null;
    return monthsOverlappingVigenciaInYear(
      vigenciaStart,
      vigenciaEnd,
      st.calendarYear,
    );
  }, [vigOn, vigenciaStart, vigenciaEnd, st.calendarYear]);

  const defaultDaysForMonth = useCallback(
    (yr: number, m: number): number[] => {
      if (vigOn) {
        return calendarDaysInMonthWithinVigencia(
          yr,
          m,
          vigenciaStart,
          vigenciaEnd,
        );
      }
      return defaultWeekdayCalendarDaysInMonth(m, yr);
    },
    [vigOn, vigenciaStart, vigenciaEnd],
  );

  const [ovMonth, setOvMonth] = useState(
    () =>
      getHydratedSchedule(value, Boolean(vigenciaStart.trim()), vigenciaStart, vigenciaEnd)
        .months[0] ?? 1,
  );
  const [ovDay, setOvDay] = useState(1);
  const [ovStart, setOvStart] = useState(
    () =>
      getHydratedSchedule(value, Boolean(vigenciaStart.trim()), vigenciaStart, vigenciaEnd)
        .defaultWindow.start,
  );
  const [ovEnd, setOvEnd] = useState(
    () =>
      getHydratedSchedule(value, Boolean(vigenciaStart.trim()), vigenciaStart, vigenciaEnd)
        .defaultWindow.end,
  );

  /** Último mes/día/horas de la fila de excepción (p. ej. al pulsar Aplicar tras cambiar el select). */
  const lastOverrideFormRef = useRef({
    month: 1,
    day: 1,
    start: "09:00" as string,
    end: "17:00" as string,
  });
  lastOverrideFormRef.current = {
    month: ovMonth,
    day: ovDay,
    start: ovStart,
    end: ovEnd,
  };

  useEffect(() => {
    if (!open) return;
    const months = monthsInScheduleAndVigencia(st, vigOn, allowedMonths);
    if (!months.length) return;
    if (!months.includes(ovMonth)) {
      setOvMonth(months[0]);
    }
  }, [open, st, vigOn, allowedMonths, ovMonth]);

  useEffect(() => {
    if (!open) return;
    const days = daysForServiceMonthInSchedule(
      st,
      ovMonth,
      vigOn,
      vigenciaStart,
      vigenciaEnd,
    );
    if (!days.length) return;
    setOvDay((d) => (days.includes(d) ? d : days[0]));
  }, [open, st, ovMonth, vigOn, vigenciaStart, vigenciaEnd]);

  const addOverride = useCallback(() => {
    const prev = stRef.current;
    const { month, day, start, end } = lastOverrideFormRef.current;
    const monthChoices = monthsInScheduleAndVigencia(
      prev,
      vigOn,
      allowedMonths,
    );
    if (!monthChoices.includes(month)) {
      toast.error(TOAST_EXC_MES);
      return;
    }
    const dayChoices = daysForServiceMonthInSchedule(
      prev,
      month,
      vigOn,
      vigenciaStart,
      vigenciaEnd,
    );
    if (!dayChoices.includes(day)) {
      toast.error(TOAST_EXC_DIA);
      return;
    }
    if (!isEndStrictlyAfterStart(start, end)) {
      toast.error(TOAST_HORARIO_FIN_TRAS_INICIO);
      return;
    }
    const key = `${month}-${day}`;
    setSt((p) => {
      const prevO = { ...(p.dayHourOverrides ?? {}) };
      return {
        ...p,
        dayHourOverrides: { ...prevO, [key]: { start, end } },
      };
    });
  }, [vigOn, allowedMonths, vigenciaStart, vigenciaEnd]);

  const removeOverride = useCallback((k: string) => {
    setSt((prev) => {
      const next = { ...(prev.dayHourOverrides ?? {}) };
      delete next[k];
      return { ...prev, dayHourOverrides: next };
    });
  }, []);

  const excMonthsForForm = useMemo(
    () => monthsInScheduleAndVigencia(st, vigOn, allowedMonths),
    [st, vigOn, allowedMonths],
  );

  const excDaysForForm = useMemo(
    () =>
      daysForServiceMonthInSchedule(st, ovMonth, vigOn, vigenciaStart, vigenciaEnd),
    [st, ovMonth, vigOn, vigenciaStart, vigenciaEnd],
  );

  const ovMonthSelectOptions = useMemo((): VtSelectOption[] => {
    return excMonthsForForm.map((m) => ({
      value: String(m),
      label: MES.find((x) => x.n === m)?.l ?? String(m),
    }));
  }, [excMonthsForForm]);

  const ovDaySelectOptions = useMemo((): VtSelectOption[] => {
    return excDaysForForm.map((d) => ({
      value: String(d),
      label: String(d),
    }));
  }, [excDaysForForm]);

  if (!open) return null;

  function isMonthAllowedInVigencia(n: number): boolean {
    if (!allowedMonths) return true;
    return allowedMonths.includes(n);
  }

  function toggleMonth(n: number) {
    if (!isMonthAllowedInVigencia(n)) return;
    setSt((prev) => {
      const y = prev.calendarYear;
      const has = prev.months.includes(n);
      const months = has
        ? prev.months.filter((m) => m !== n)
        : [...prev.months, n].sort((a, b) => a - b);
      const daysByMonth = { ...prev.daysByMonth };
      if (!has) {
        daysByMonth[n] = defaultDaysForMonth(y, n);
      }
      return { ...prev, months, daysByMonth };
    });
  }

  function setCalendarYear(nextYear: number) {
    setSt((prev) => {
      if (!vigOn) {
        const daysByMonth = { ...prev.daysByMonth };
        for (const m of prev.months) {
          daysByMonth[m] = defaultWeekdayCalendarDaysInMonth(m, nextYear);
        }
        return { ...prev, calendarYear: nextYear, daysByMonth };
      }
      const allowed = monthsOverlappingVigenciaInYear(
        vigenciaStart,
        vigenciaEnd,
        nextYear,
      );
      if (!allowed.length) {
        return prev;
      }
      const nextFromPrev = prev.months.filter((m) => allowed.includes(m));
      const months = nextFromPrev.length > 0 ? nextFromPrev : [...allowed];
      const daysByMonth: Record<number, number[]> = {};
      for (const m of months) {
        const inVig = calendarDaysInMonthWithinVigencia(
          nextYear,
          m,
          vigenciaStart,
          vigenciaEnd,
        );
        const ex = prev.daysByMonth[m];
        if (ex?.length) {
          const pruned = ex.filter((d) => inVig.includes(d));
          daysByMonth[m] = pruned.length > 0 ? pruned : inVig;
        } else {
          daysByMonth[m] = inVig;
        }
      }
      const dayHourOverrides = { ...(prev.dayHourOverrides ?? {}) };
      for (const k of Object.keys(dayHourOverrides)) {
        const mo = Number(k.split("-")[0]);
        if (!months.includes(mo)) delete dayHourOverrides[k];
      }
      return {
        ...prev,
        calendarYear: nextYear,
        months,
        daysByMonth,
        dayHourOverrides,
      };
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

  function finish() {
    if (!st.months.length) {
      toast.error("Elige al menos un mes.");
      return;
    }
    if (!isEndStrictlyAfterStart(st.defaultWindow.start, st.defaultWindow.end)) {
      toast.error(TOAST_HORARIO_FIN_TRAS_INICIO);
      return;
    }
    for (const [, v] of Object.entries(st.dayHourOverrides)) {
      if (!isEndStrictlyAfterStart(v.start, v.end)) {
        toast.error(
          "Revisa las excepciones: en cada fila, el fin debe ser posterior al inicio.",
        );
        return;
      }
    }
    const next = ensureDaysForSelectedMonths(st);
    if (!next) return;
    onSave(next);
    onClose();
  }

  const stepTitle = STEP_TITLES[sub] ?? "Meses";
  const vigenciaResumen = vigenciaEnd.trim()
    ? `${vigenciaStart} → ${vigenciaEnd}`
    : `desde ${vigenciaStart}`;

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
          Paso {sub + 1} de 3: {stepTitle}
        </p>

        {sub === 0 ? (
          <div className="space-y-3">
            {vigOn ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] px-3 py-2">
                <span className="text-xs font-bold text-[var(--muted)]">
                  Año de referencia
                </span>
                <VtSelect
                  value={String(year)}
                  onChange={(v) => setCalendarYear(Number(v))}
                  options={yearSelectOptions}
                  className="max-w-[120px]"
                  listPortal
                  listPortalZIndexClass="z-[200]"
                  ariaLabel="Año de referencia"
                />
                <span className="min-w-0 text-[11px] leading-snug text-[var(--muted)]">
                  Solo puedes marcar meses calendario que entren en el período de vigencia (
                  {vigenciaResumen}).
                </span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {MES.map(({ n, l }) => {
                const inVig = isMonthAllowedInVigencia(n);
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!inVig}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-bold",
                      !inVig &&
                        "cursor-not-allowed border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] opacity-50",
                      inVig && st.months.includes(n)
                        ? "border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface))]"
                        : inVig &&
                            "border-[var(--border)] bg-[var(--surface)] hover:opacity-95",
                    )}
                    onClick={() => toggleMonth(n)}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {sub === 1 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] px-3 py-2">
              <span className="text-xs font-bold text-[var(--muted)]">
                Año de referencia (calendario)
              </span>
              <VtSelect
                value={String(year)}
                onChange={(v) => setCalendarYear(Number(v))}
                options={yearSelectOptions}
                className="max-w-[120px]"
                listPortal
                listPortalZIndexClass="z-[200]"
                ariaLabel="Año de referencia del calendario"
              />
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
                <VtTimeField
                  value={st.defaultWindow.start}
                  onChange={(t) =>
                    setSt((p) => {
                      if (!isEndStrictlyAfterStart(t, p.defaultWindow.end)) {
                        toast.error(TOAST_HORARIO_FIN_TRAS_INICIO);
                        return p;
                      }
                      return {
                        ...p,
                        defaultWindow: { ...p.defaultWindow, start: t },
                      };
                    })
                  }
                  aria-label="Hora inicio del horario predeterminado"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[var(--muted)]">
                  Hasta (predeterminado)
                </span>
                <VtTimeField
                  value={st.defaultWindow.end}
                  onChange={(t) =>
                    setSt((p) => {
                      if (!isEndStrictlyAfterStart(p.defaultWindow.start, t)) {
                        toast.error(TOAST_HORARIO_FIN_TRAS_INICIO);
                        return p;
                      }
                      return {
                        ...p,
                        defaultWindow: { ...p.defaultWindow, end: t },
                      };
                    })
                  }
                  aria-label="Hora fin del horario predeterminado"
                />
              </label>
            </div>
            <p className="text-xs text-[var(--muted)]">
              El cierre de la franja (predeterminada o de excepción) debe quedar
              a una hora estrictamente posterior al inicio (mismo día). El
              rango predeterminado aplica a los días habilitados. Las
              excepciones solo se pueden fijar en meses que entren en la
              vigencia y en días en los que el servicio ya está activado en el
              paso 2; fechas distintas se listan, la misma fecha reemplaza esa
              excepción.
            </p>
            <div className="space-y-3 rounded-xl border border-dashed border-[var(--border)] p-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[var(--muted)]">
                    Mes
                  </span>
                  <VtSelect
                    value={String(
                      excMonthsForForm.includes(ovMonth)
                        ? ovMonth
                        : (excMonthsForForm[0] ?? ovMonth),
                    )}
                    onChange={(v) => setOvMonth(Number(v))}
                    options={ovMonthSelectOptions}
                    disabled={!excMonthsForForm.length}
                    listPortal
                    listPortalZIndexClass="z-[220]"
                    className="min-w-[7.5rem] max-w-[10rem] sm:max-w-none"
                    ariaLabel="Mes de la excepción"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[var(--muted)]">
                    Día del mes
                  </span>
                  <VtSelect
                    value={String(
                      excDaysForForm.includes(ovDay)
                        ? ovDay
                        : (excDaysForForm[0] ?? ovDay),
                    )}
                    onChange={(v) => setOvDay(Number(v))}
                    options={ovDaySelectOptions}
                    disabled={!excDaysForForm.length}
                    listPortal
                    listPortalZIndexClass="z-[220]"
                    className="min-w-[4.5rem] max-w-[5.5rem]"
                    ariaLabel="Día del mes de la excepción"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
                <label className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs font-bold text-[var(--muted)]">
                    Inicio (excepción)
                  </span>
                  <VtTimeField
                    className="w-full min-w-0"
                    value={ovStart}
                    onChange={(t) => {
                      if (!isEndStrictlyAfterStart(t, ovEnd)) {
                        toast.error(TOAST_HORARIO_FIN_TRAS_INICIO);
                        return;
                      }
                      setOvStart(t);
                    }}
                    aria-label="Hora inicio de la excepción"
                  />
                </label>
                <label className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs font-bold text-[var(--muted)]">
                    Fin (excepción)
                  </span>
                  <VtTimeField
                    className="w-full min-w-0"
                    value={ovEnd}
                    onChange={(t) => {
                      if (!isEndStrictlyAfterStart(ovStart, t)) {
                        toast.error(TOAST_HORARIO_FIN_TRAS_INICIO);
                        return;
                      }
                      setOvEnd(t);
                    }}
                    aria-label="Hora fin de la excepción"
                  />
                </label>
              </div>
              <div>
                <button
                  type="button"
                  className="vt-btn vt-btn-sm"
                  onClick={addOverride}
                >
                  Aplicar horario
                </button>
              </div>
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
                        if (!dbm[m]?.length) {
                          dbm[m] = defaultDaysForMonth(
                            p.calendarYear,
                            m,
                          );
                        }
                      }
                      return { ...p, daysByMonth: dbm };
                    });
                    setSub(1);
                    return;
                  }
                  if (sub === 1) {
                    if (!st.months.length) {
                      toast.error("Elige al menos un mes.");
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
