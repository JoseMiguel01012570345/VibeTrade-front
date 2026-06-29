import type { AgreementPaymentStatusApi, AgreementRoutePathApi } from "@features/chat/Dtos/agreement/agreementCheckoutApiTypes";
import type { RouteStopDeliveryStatusApi } from "@features/chat/Dtos/route-sheet/routeLogisticsApiTypes";
import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import { routeSheetEstadoIsEntregada } from "@features/chat/logic/route-sheet/routeSheetTypes";
import type { TradeAgreement } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import { agreementDeclaresMerchandise, normalizeAgreementServices } from "@features/chat/logic/agreement/tradeAgreementTypes";
import {
  minorToMajor,
  currencyMinorDecimals,
} from "@features/payments/logic/paymentFeePolicy";

export function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Todas las entradas de recurrencia del acuerdo tienen un pago registrado. */
export function computeAllSlotsPaid(
  agreement: TradeAgreement,
  paidKeys: ReadonlySet<string>,
): boolean {
  const items = normalizeAgreementServices(agreement);
  if (items.length === 0) return false;
  for (const sv of items) {
    for (const e of sv.recurrenciaPagos?.entries ?? []) {
      if (!paidKeys.has(recurrenceSlotKey(sv.id, e.month, e.day))) return false;
    }
  }
  return true;
}

export function fmtPaymentAmount(amountMinor: number, curLower: string): string {
  const maj = minorToMajor(amountMinor, curLower);
  const frac = currencyMinorDecimals(curLower);
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
