import type { OrderStatus, OrderTrackingDto } from "../Dtos/orders";

/**
 * Modelo del resultado de rastreo (réplica de la app de referencia,
 * `reference/frontend-guest/src/lib/trackShipmentUtils.ts`), adaptado al pedido de
 * VibeTrade (`OrderTrackingDto`). VibeTrade sólo persiste el estado y la fecha de
 * creación, así que las fechas por paso y la llegada estimada se derivan de forma
 * sintética a partir de `createdAtUtc` (igual que la referencia).
 */

export type TrackingPhase = "received" | "processing" | "transit" | "delivered";

export type StepState = "done" | "current" | "pending";

export type TrackingSuccessModel = {
  phase: TrackingPhase;
  badgeLabel: string;
  estimatedDelivery: Date;
  stepDates: [Date, Date, Date, Date];
};

export const TRACK_STEP_LABELS: {
  title: string;
  pendingSub?: string;
}[] = [
  { title: "Pedido Recibido" },
  { title: "Procesando" },
  { title: "En Tránsito" },
  { title: "Entregado", pendingSub: "Pendiente" },
];

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Fecha corta en español, ej. "7 jul 2026" (sin puntos abreviados del mes). */
export function formatEsShort(d: Date): string {
  return d
    .toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace(/\./g, "");
}

export function badgeForPhase(phase: TrackingPhase): string {
  switch (phase) {
    case "received":
      return "PEDIDO RECIBIDO";
    case "processing":
      return "PROCESANDO";
    case "transit":
      return "EN TRÁNSITO";
    case "delivered":
      return "ENTREGADO";
    default:
      return "";
  }
}

const CURRENT_STEP_INDEX: Record<Exclude<TrackingPhase, "delivered">, number> = {
  received: 0,
  processing: 1,
  transit: 2,
};

export function stepStatesForPhase(phase: TrackingPhase): StepState[] {
  if (phase === "delivered") return ["done", "done", "done", "done"];
  const current = CURRENT_STEP_INDEX[phase];
  return [0, 1, 2, 3].map((i) => {
    if (i < current) return "done";
    return i === current ? "current" : "pending";
  });
}

/**
 * VibeTrade tiene 3 estados (procesado → en_transito → entregado). El primer paso del
 * hilo ("Pedido Recibido") siempre está cumplido para un pedido que existe, así que
 * "procesado" se mapea a la fase "processing".
 */
export function phaseFromOrderStatus(status: OrderStatus): TrackingPhase {
  switch (status) {
    case "entregado":
      return "delivered";
    case "en_transito":
      return "transit";
    case "procesado":
      return "processing";
    default:
      return "received";
  }
}

export function buildTrackingSuccessModel(
  order: OrderTrackingDto,
): TrackingSuccessModel {
  const phase = phaseFromOrderStatus(order.status);
  const created = new Date(order.createdAtUtc);
  const base = Number.isNaN(created.getTime()) ? new Date() : created;
  const d0 = addDays(base, 0);
  const d1 = addDays(d0, 1);
  const d2 = addDays(d1, 2);
  const total = Number.isFinite(order.total) ? order.total : 0;
  const eta = addDays(
    d2,
    phase === "delivered" ? 1 : 5 + Math.min(10, Math.floor(total % 7)),
  );
  return {
    phase,
    badgeLabel: badgeForPhase(phase),
    estimatedDelivery: eta,
    stepDates: [d0, d1, d2, eta],
  };
}
