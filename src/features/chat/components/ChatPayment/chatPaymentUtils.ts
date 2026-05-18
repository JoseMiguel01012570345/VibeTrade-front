import type { AgreementPaymentStatusApi } from "@/utils/chat/agreementCheckoutApi";
import type { RouteStopDeliveryStatusApi } from "@/utils/chat/routeLogisticsApi";
import {
  minorToMajor,
  stripeMinorDecimals,
} from "@features/market/model/paymentFeePolicy";

export function fmtPaymentAmount(amountMinor: number, curLower: string): string {
  const maj = minorToMajor(amountMinor, curLower);
  const frac = stripeMinorDecimals(curLower);
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: curLower.slice(0, 3).toUpperCase(),
      minimumFractionDigits: frac,
      maximumFractionDigits: frac,
    }).format(maj);
  } catch {
    return `${maj.toFixed(frac)} ${curLower.toUpperCase()}`;
  }
}

export function currencyPaid(
  statuses: AgreementPaymentStatusApi[],
  curLower: string,
): boolean {
  return statuses.some(
    (x) =>
      x.status === "succeeded" &&
      x.currency.trim().toLowerCase() === curLower.trim().toLowerCase(),
  );
}

export function recurrenceSlotKey(
  serviceItemId: string,
  month: number,
  day: number,
): string {
  return `${serviceItemId}:${month}-${day}`;
}

export function parseMajorAmount(raw: string | undefined): number {
  const t = (raw ?? "")
    .trim()
    .replace(",", ".")
    .replace(/\u00a0/g, " ");
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

export function routeStopIsPayable(stop: { precioTransportista?: string }): boolean {
  return parseMajorAmount(stop.precioTransportista) > 0;
}

export function deliveryMarksStopPaid(d: RouteStopDeliveryStatusApi): boolean {
  const st = (d.state ?? "").trim().toLowerCase();
  if (!st) return false;
  if (st === "unpaid") return false;
  if (st.startsWith("refunded")) return false;
  return true;
}
