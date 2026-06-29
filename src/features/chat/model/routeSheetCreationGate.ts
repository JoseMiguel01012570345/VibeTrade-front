import type { TradeAgreement } from "./tradeAgreementTypes";

/** Acuerdo aceptado que aún permite crear/vincular una hoja (sin pago o con cobro pero sin roadmap). */
export function agreementNeedsRouteSheetSlot(
  agreement: TradeAgreement,
): boolean {
  if (agreement.status !== "accepted") return false;
  const paid = agreement.hasSucceededPayments === true;
  const hasRoute = !!(agreement.routeSheetId ?? "").trim();
  return !paid || !hasRoute;
}

/** True si el hilo puede abrir el formulario de nueva hoja (al menos un cupo libre). */
export function threadCanCreateRouteSheet(
  contracts: readonly TradeAgreement[],
): boolean {
  return contracts.some(agreementNeedsRouteSheetSlot);
}

/** Cupos de hoja permitidos según acuerdos aceptados (espejo del backend). */
export function threadRouteSheetSlotCount(
  contracts: readonly TradeAgreement[],
): number {
  return contracts.filter(agreementNeedsRouteSheetSlot).length;
}

/** Bloquea crear otra hoja cuando ya hay tantas como cupos. */
export function threadRouteSheetCreationBlocked(
  contracts: readonly TradeAgreement[],
  activeRouteSheetCount: number,
): boolean {
  const slots = threadRouteSheetSlotCount(contracts);
  return activeRouteSheetCount >= slots;
}
