import type {
  AgreementPaymentStatusApi,
  AgreementRoutePathApi,
} from "@/utils/chat/agreementCheckoutApi";
import type { RouteStopDeliveryStatusApi } from "@/utils/chat/routeLogisticsApi";
import {
  routeSheetEstadoIsEntregada,
  type RouteSheet,
} from "@features/market/model/routeSheetTypes";
import {
  agreementDeclaresMerchandise,
  type TradeAgreement,
} from "@features/market/model/tradeAgreementTypes";
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

/** Tramos con precio pero aún no cobrables (p. ej. transportistas sin confirmar). */
export function routePathsAwaitUnconfirmedCarriers(
  paths: readonly AgreementRoutePathApi[],
): AgreementRoutePathApi[] {
  return paths.filter(
    (p) =>
      !p.paid &&
      !p.partiallyPaid &&
      !p.payable &&
      (p.totalsByCurrency?.length ?? 0) > 0,
  );
}

/** Hoja entregada en acuerdo con cobros: no avisar por carriers pendientes (logística cerrada). */
export function shouldSkipRouteCarrierPaymentWarning(
  agreement: TradeAgreement | null,
  linkedRouteSheet: Pick<RouteSheet, "estado"> | null | undefined,
): boolean {
  if (!agreement?.hasSucceededPayments) return false;
  return routeSheetEstadoIsEntregada(linkedRouteSheet?.estado);
}

/** Aviso al comprador: hoja vinculada, transporte sin pagar y carriers pendientes. */
export function shouldWarnUnconfirmedRouteCarriers(
  agreement: TradeAgreement | null,
  paths: readonly AgreementRoutePathApi[],
  serviceOnly: boolean,
  linkedRouteSheet?: Pick<RouteSheet, "estado"> | null,
): boolean {
  if (!agreement || serviceOnly) return false;
  if (shouldSkipRouteCarrierPaymentWarning(agreement, linkedRouteSheet)) {
    return false;
  }
  if (!agreementDeclaresMerchandise(agreement)) return false;
  if ((agreement.routeSheetId ?? "").trim().length < 2) return false;
  if (paths.length === 0) return false;
  if (paths.every((p) => p.paid)) return false;
  return routePathsAwaitUnconfirmedCarriers(paths).length > 0;
}
