import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { VtSelect, type VtSelectOption } from "../../../../../components/VtSelect";
import { cn } from "../../../../../lib/cn";
import { parseDecimal } from "../../../domain/tradeAgreementValidation";
import { onBackdropPointerClose } from "../../../lib/modalClose";
import {
  monthsInScheduleAndVigencia,
  daysForServiceMonthInSchedule,
} from "../../../domain/serviceScheduleMonthDayConstraints";
import { monthsOverlappingVigenciaInYear } from "../../../domain/serviceVigenciaDates";
import type {
  ServicePaymentRecurrence,
  ServiceScheduleState,
} from "../../../domain/tradeAgreementTypes";
import {
  coerceServiceSchedule,
  DEFAULT_RECURRENCE_MONEDA,
  emptyServicePaymentRecurrence,
} from "../../../domain/tradeAgreementTypes";
import { modalShellWide } from "../../../styles/formModalStyles";

const MES = [
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
] as const;

/** Mismo aviso vía toast que al guardar con mes/día repetidos (id evita toasts dobles al re-render). */
const TOAST_PAGO_DUPLICADO = "No puedes repetir el mismo mes y día del mes en dos filas." as const;
const TOAST_ID_PAGO_DUPLICADO = "service-payment-duplicate-mes-dia" as const;

type Props = {
  open: boolean
  value: ServicePaymentRecurrence
  /** Grilla de horarios (mismas reglas de mes y día del mes que el paso 3 de horarios). */
  horarios: ServiceScheduleState
  vigenciaStart?: string
  vigenciaEnd?: string
  /** Monedas ofrecidas por fila (ficha de catálogo o lista base del asistente). */
  monedaOptions: string[]
  onSave: (v: ServicePaymentRecurrence) => void
  onClose: () => void
}

function clampServicePaymentRecurrence(
  v: ServicePaymentRecurrence,
  h: ServiceScheduleState,
  vigOn: boolean,
  vigStart: string,
  vigEnd: string,
  allowedVig: number[] | null,
  monedaOptions: string[],
): ServicePaymentRecurrence {
  const pickMon = (raw: string) => {
    const t = raw.trim();
    if (t && monedaOptions.includes(t)) return t;
    return monedaOptions[0] ?? DEFAULT_RECURRENCE_MONEDA;
  };
  const picker = monthsInScheduleAndVigencia(h, vigOn, allowedVig);
  const safeMonths = v.months
    .filter((m) => picker.includes(m))
    .sort((a, b) => a - b);
  let months = safeMonths;
  if (!months.length && picker.length) {
    months = [picker[0]!];
  }
  const dayList = (m: number) =>
    daysForServiceMonthInSchedule(h, m, vigOn, vigStart, vigEnd);

  let entries = v.entries.map((e) => {
    let month = e.month;
    if (!months.includes(month)) {
      month = months[0] ?? picker[0] ?? 1;
    }
    if (!picker.includes(month)) {
      month = picker[0] ?? month;
    }
    const dl = dayList(month);
    let day = e.day;
    if (!dl.includes(day)) {
      day = dl[0] ?? 1;
    }
    return { ...e, month, day, moneda: pickMon(e.moneda ?? "") };
  });
  if (!entries.length && months.length) {
    const m0 = months[0]!;
    const dl = dayList(m0);
    entries = [
      {
        month: m0,
        day: dl[0] ?? 1,
        amount: "1",
        moneda: pickMon(""),
      },
    ];
  }
  return { months, entries };
}

/** Primer par mes/día aún no usado en `entries`, limitado a meses y días de la grilla. */
function findFirstFreePaymentSlot(
  prev: ServicePaymentRecurrence,
  h: ServiceScheduleState,
  pickerMonths: number[],
  vigOn: boolean,
  vigStart: string,
  vigEnd: string,
): { month: number; day: number } | null {
  const used = new Set(prev.entries.map((e) => `${e.month}-${e.day}`));
  const monthsOrder =
    prev.months.length > 0
      ? [...prev.months].sort((a, b) => a - b)
      : [...pickerMonths].sort((a, b) => a - b);
  for (const m of monthsOrder) {
    if (!pickerMonths.includes(m)) continue;
    const dl = daysForServiceMonthInSchedule(h, m, vigOn, vigStart, vigEnd);
    for (const d of dl) {
      if (!used.has(`${m}-${d}`)) {
        return { month: m, day: d };
      }
    }
  }
  return null;
}

export function ServicePaymentRecurrenceModal({
  open,
  value,
  horarios,
  vigenciaStart = "",
  vigenciaEnd = "",
  monedaOptions: monedaOptionsProp,
  onSave,
  onClose,
}: Props) {
  const monedaOptions =
    monedaOptionsProp.length > 0
      ? monedaOptionsProp
      : [DEFAULT_RECURRENCE_MONEDA];
  const h = useMemo(() => coerceServiceSchedule(horarios), [horarios]);
  const vigOn = Boolean(vigenciaStart.trim());
  const allowedVigMonths = useMemo(
    () =>
      vigOn
        ? monthsOverlappingVigenciaInYear(
            vigenciaStart,
            vigenciaEnd,
            h.calendarYear,
          )
        : null,
    [vigOn, vigenciaStart, vigenciaEnd, h.calendarYear],
  );
  const pickerMonths = useMemo(
    () => monthsInScheduleAndVigencia(h, vigOn, allowedVigMonths),
    [h, vigOn, allowedVigMonths],
  );
  const [st, setSt] = useState<ServicePaymentRecurrence>(
    emptyServicePaymentRecurrence(),
  );
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (!wasOpenRef.current) {
      setSt(
        clampServicePaymentRecurrence(
          {
            months: [...value.months].sort((a, b) => a - b),
            entries: value.entries.map((e) => ({ ...e })),
          },
          h,
          vigOn,
          vigenciaStart,
          vigenciaEnd,
          allowedVigMonths,
          monedaOptions,
        ),
      );
    }
    wasOpenRef.current = true;
  }, [
    open,
    value,
    h,
    vigOn,
    vigenciaStart,
    vigenciaEnd,
    allowedVigMonths,
    monedaOptions,
  ]);

  if (!open) return null;

  function toggleMonth(n: number) {
    if (!pickerMonths.includes(n)) return;
    setSt((prev) => {
      const has = prev.months.includes(n);
      const months = has
        ? prev.months.filter((m) => m !== n)
        : [...prev.months, n].sort((a, b) => a - b);
      return { ...prev, months };
    });
  }

  function updateEntry(
    i: number,
    patch: Partial<{
      month: number
      day: number
      amount: string
      moneda: string
    }>,
  ) {
    setSt((prev) => {
      const entries = [...prev.entries];
      const cur: {
        month: number
        day: number
        amount: string
        moneda: string
      } = {
        ...entries[i]!,
        ...patch,
      };
      if (patch.month != null) {
        const dlist = daysForServiceMonthInSchedule(
          h,
          cur.month,
          vigOn,
          vigenciaStart,
          vigenciaEnd,
        );
        if (!dlist.includes(cur.day)) {
          cur.day = dlist[0] ?? 1;
        }
      }
      if (patch.moneda != null) {
        const t = String(patch.moneda).trim();
        cur.moneda = monedaOptions.includes(t) ? t : (monedaOptions[0] ?? DEFAULT_RECURRENCE_MONEDA);
      }
      if (patch.month != null || patch.day != null) {
        const conflict = prev.entries.some(
          (e, j) => j !== i && e.month === cur.month && e.day === cur.day,
        );
        if (conflict) {
          toast.error(TOAST_PAGO_DUPLICADO, { id: TOAST_ID_PAGO_DUPLICADO });
          return prev;
        }
      }
      entries[i] = cur;
      return { ...prev, entries };
    });
  }

  function addEntry() {
    const slot0 = findFirstFreePaymentSlot(
      st,
      h,
      pickerMonths,
      vigOn,
      vigenciaStart,
      vigenciaEnd,
    );
    if (!slot0) {
      toast.error(TOAST_PAGO_DUPLICADO, { id: TOAST_ID_PAGO_DUPLICADO });
      return;
    }
    setSt((prev) => {
      const slot = findFirstFreePaymentSlot(
        prev,
        h,
        pickerMonths,
        vigOn,
        vigenciaStart,
        vigenciaEnd,
      );
      if (!slot) {
        return prev;
      }
      const pickMon = prev.entries[0]?.moneda?.trim() &&
        monedaOptions.includes(prev.entries[0].moneda.trim())
        ? prev.entries[0].moneda.trim()
        : (monedaOptions[0] ?? DEFAULT_RECURRENCE_MONEDA);
      return {
        ...prev,
        entries: [
          ...prev.entries,
          { ...slot, amount: "1", moneda: pickMon },
        ],
      };
    });
  }

  function removeEntry(i: number) {
    setSt((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, j) => j !== i),
    }));
  }

  function save() {
    if (!pickerMonths.length) {
      toast.error(
        "No hay meses con servicio: revisa el paso de horarios o la vigencia.",
      );
      return;
    }
    if (!st.months.length) {
      toast.error("Elige al menos un mes.");
      return;
    }
    for (const m of st.months) {
      if (!pickerMonths.includes(m)) {
        toast.error("Algún mes ya no aplica: quitá o reemplazá la selección.");
        return;
      }
    }
    if (!st.entries.length) {
      toast.error("Añade al menos una fila de pago.");
      return;
    }
    const seen = new Set<string>();
    for (let i = 0; i < st.entries.length; i++) {
      const en = st.entries[i];
      if (!st.months.includes(en.month)) {
        toast.error(
          `Fila ${i + 1}: el mes no está entre los meses seleccionados.`,
        );
        return;
      }
      const allowedDays = daysForServiceMonthInSchedule(
        h,
        en.month,
        vigOn,
        vigenciaStart,
        vigenciaEnd,
      );
      if (!allowedDays.length || !allowedDays.includes(en.day)) {
        toast.error(
          `Fila ${i + 1}: elige un día de la grilla de horarios (y vigencia) para ese mes.`,
        );
        return;
      }
      const key = `${en.month}-${en.day}`;
      if (seen.has(key)) {
        toast.error(TOAST_PAGO_DUPLICADO, { id: TOAST_ID_PAGO_DUPLICADO });
        return;
      }
      seen.add(key);
      const mon = String(en.moneda ?? "").trim();
      if (!mon) {
        toast.error(`Fila ${i + 1}: elige la moneda.`);
        return;
      }
      if (!monedaOptions.includes(mon)) {
        toast.error(`Fila ${i + 1}: moneda no disponible.`);
        return;
      }
      const n = parseDecimal(en.amount);
      if (n === null || n <= 0) {
        toast.error(`Fila ${i + 1}: el monto debe ser mayor que cero.`);
        return;
      }
    }
    onSave(st);
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
        <div className="vt-modal-title">Recurrencia de pagos</div>
        <p className="vt-muted mb-3 text-[13px]">
          Los meses y días coinciden con la grilla de horarios (y la vigencia del contrato). En cada fila
          indica mes, día, moneda y monto; las monedas posibles dependen de la ficha (si anclaste el servicio) o
          de la lista general del asistente.
        </p>

        {!pickerMonths.length ? (
          <p className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">
            No hay meses de servicio definidos. Completa el paso de horarios (meses) antes de
            recurrentes.
          </p>
        ) : null}

        <div className="mb-4 text-xs font-extrabold text-[var(--muted)]">Meses incluidos</div>
        <div className="mb-6 flex flex-wrap gap-2">
          {pickerMonths.map((n) => {
            const l = MES.find((x) => x.n === n)?.l ?? String(n);
            return (
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
            );
          })}
        </div>

        <div className="max-h-[min(45vh,360px)] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-bold text-[var(--muted)]">
                <th className="py-2 pr-2">Mes</th>
                <th className="py-2 pr-2">Día</th>
                <th className="py-2 pr-2">Moneda</th>
                <th className="py-2 pr-2">Monto</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {st.entries.map((en, i) => {
                const dayChoices = daysForServiceMonthInSchedule(
                  h,
                  en.month,
                  vigOn,
                  vigenciaStart,
                  vigenciaEnd,
                );
                const monthOptions: VtSelectOption[] = st.months.map((m) => ({
                  value: String(m),
                  label: MES.find((x) => x.n === m)?.l ?? String(m),
                }));
                const dayOptions: VtSelectOption[] = dayChoices.map((d) => ({
                  value: String(d),
                  label: String(d),
                }));
                const monedaSelectOptions: VtSelectOption[] = monedaOptions.map(
                  (m) => ({ value: m, label: m }),
                );
                return (
                  <tr
                    key={i}
                    className="border-b border-[color-mix(in_oklab,var(--border)_70%,transparent)]"
                  >
                    <td className="py-2 pr-2 align-middle">
                      <VtSelect
                        value={String(en.month)}
                        onChange={(v) =>
                          updateEntry(i, { month: Number(v) })
                        }
                        options={monthOptions}
                        className="min-w-[6rem]"
                        listPortal
                        listPortalZIndexClass="z-[200]"
                        ariaLabel="Mes de pago"
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <VtSelect
                        value={String(en.day)}
                        onChange={(v) =>
                          updateEntry(i, { day: Number(v) })
                        }
                        options={dayOptions}
                        className="min-w-[4.5rem]"
                        listPortal
                        listPortalZIndexClass="z-[200]"
                        ariaLabel="Día de pago"
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <VtSelect
                        value={en.moneda}
                        onChange={(v) => updateEntry(i, { moneda: v })}
                        options={monedaSelectOptions}
                        className="min-w-[4.5rem]"
                        listPortal
                        listPortalZIndexClass="z-[200]"
                        ariaLabel="Moneda del pago"
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <input
                        className="vt-input min-w-[100px] py-1.5 text-sm"
                        value={en.amount}
                        placeholder="0"
                        inputMode="decimal"
                        onChange={(e) => updateEntry(i, { amount: e.target.value })}
                      />
                    </td>
                    <td className="py-2 align-middle">
                      <button
                        type="button"
                        className="vt-btn vt-btn-ghost vt-btn-sm text-[var(--muted)]"
                        onClick={() => removeEntry(i)}
                        disabled={st.entries.length <= 1}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          className="vt-btn mt-2"
          onClick={addEntry}
          disabled={!pickerMonths.length || !st.months.length}
        >
          + Añadir pago
        </button>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            disabled={
              !pickerMonths.length || !st.months.length || !st.entries.length
            }
            onClick={save}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
