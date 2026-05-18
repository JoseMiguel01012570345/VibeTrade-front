import { calendarDaysInMonthWithinVigencia } from "./serviceVigenciaDates";
import {
  defaultWeekdayCalendarDaysInMonth,
  type ServiceScheduleState,
} from "./tradeAgreementTypes";

/**
 * Meses habilitados: meses del servicio (paso 1 de horarios) recortados a la vigencia
 * en el año de referencia.
 */
export function monthsInScheduleAndVigencia(
  s: ServiceScheduleState,
  vigOn: boolean,
  allowedInCalendarYear: number[] | null,
): number[] {
  if (!s.months.length) return [];
  if (!vigOn || !allowedInCalendarYear?.length) {
    return s.months;
  }
  return s.months.filter((m) => allowedInCalendarYear.includes(m));
}

/**
 * Días habilitables en un mes: los marcados en la grilla; si aún no hay, días de vigencia
 * en ese mes (o días laborables L–V sin vigencia).
 */
export function daysForServiceMonthInSchedule(
  s: ServiceScheduleState,
  month: number,
  vigOn: boolean,
  vigenciaStart: string,
  vigenciaEnd: string,
): number[] {
  const y = s.calendarYear;
  const g = s.daysByMonth[month];
  if (g?.length) {
    return [...g].sort((a, b) => a - b);
  }
  if (vigOn) {
    return calendarDaysInMonthWithinVigencia(
      y,
      month,
      vigenciaStart,
      vigenciaEnd,
    );
  }
  return defaultWeekdayCalendarDaysInMonth(month, y);
}
