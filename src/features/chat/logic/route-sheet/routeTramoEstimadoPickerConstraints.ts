import type { RouteTramoFormInput } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import {
  estimadoInstantMs,
  maxIsoDate,
  splitRouteEstimadoStored,
  todayIsoDateLocal,
} from "./routeSheetDateTime";
import type { RouteEstimadoDateBounds } from "@features/chat/Dtos/route-sheet/routeTramoEstimadoPickerConstraintsTypes";

function isoDateOnly(raw: string | undefined): string {
  return splitRouteEstimadoStored(raw).date.trim();
}

/** Límites de fecha para recogida estimada (alineados con `getRouteSheetFormErrors`). */
export function routeRecogidaDateBounds(
  tramos: RouteTramoFormInput[],
  tramoIndex: number,
): RouteEstimadoDateBounds {
  const today = todayIsoDateLocal();
  let min = today;

  if (tramoIndex > 0) {
    const prevEnt = isoDateOnly(tramos[tramoIndex - 1]?.tiempoEntregaEstimado);
    if (prevEnt) min = maxIsoDate(min, prevEnt);
  }

  const cur = tramos[tramoIndex];
  const entDate = isoDateOnly(cur?.tiempoEntregaEstimado);
  const nextRec = isoDateOnly(tramos[tramoIndex + 1]?.tiempoRecogidaEstimado);

  let max = "";
  if (entDate) max = entDate;
  if (nextRec) {
    if (!max || nextRec < max) max = nextRec;
  }

  return { min, max };
}

/** Límites de fecha para entrega estimada (alineados con `getRouteSheetFormErrors`). */
export function routeEntregaDateBounds(
  tramos: RouteTramoFormInput[],
  tramoIndex: number,
): RouteEstimadoDateBounds {
  const recBounds = routeRecogidaDateBounds(tramos, tramoIndex);
  const cur = tramos[tramoIndex];
  const recDate = isoDateOnly(cur?.tiempoRecogidaEstimado);
  const min = maxIsoDate(recBounds.min, recDate);

  const nextRec = isoDateOnly(tramos[tramoIndex + 1]?.tiempoRecogidaEstimado);
  return { min, max: nextRec };
}

function instantOnDate(date: string, hhmm: string): number | null {
  if (!date.trim() || !hhmm.trim()) return null;
  return estimadoInstantMs(`${date.trim()}T${hhmm.trim()}`);
}

/** True si la hora elegida invalidaría la hoja (mismo día que referencias vecinas o pasado). */
export function isRouteEstimadoTimeDisabled(
  kind: "recogida" | "entrega",
  tramos: RouteTramoFormInput[],
  tramoIndex: number,
  pickedDate: string,
  hhmm: string,
): boolean {
  const date = pickedDate.trim();
  const time = hhmm.trim();
  if (!date || !time) return false;

  const pickedMs = instantOnDate(date, time);
  if (pickedMs === null) return true;

  const today = todayIsoDateLocal();
  if (date === today && pickedMs < Date.now()) return true;

  const tramo = tramos[tramoIndex];
  if (!tramo) return false;

  if (kind === "recogida") {
    const ent = splitRouteEstimadoStored(tramo.tiempoEntregaEstimado);
    if (ent.date === date && ent.time) {
      const entMs = instantOnDate(ent.date, ent.time);
      if (entMs !== null && pickedMs >= entMs) return true;
    }
    if (tramoIndex > 0) {
      const prevEnt = splitRouteEstimadoStored(
        tramos[tramoIndex - 1]?.tiempoEntregaEstimado,
      );
      if (prevEnt.date === date && prevEnt.time) {
        const prevMs = instantOnDate(prevEnt.date, prevEnt.time);
        if (prevMs !== null && pickedMs <= prevMs) return true;
      }
    }
    return false;
  }

  const rec = splitRouteEstimadoStored(tramo.tiempoRecogidaEstimado);
  if (rec.date === date && rec.time) {
    const recMs = instantOnDate(rec.date, rec.time);
    if (recMs !== null && pickedMs <= recMs) return true;
  }

  const nextRec = splitRouteEstimadoStored(
    tramos[tramoIndex + 1]?.tiempoRecogidaEstimado,
  );
  if (nextRec.date === date && nextRec.time) {
    const nextMs = instantOnDate(nextRec.date, nextRec.time);
    if (nextMs !== null && pickedMs > nextMs) return true;
  }

  return false;
}
