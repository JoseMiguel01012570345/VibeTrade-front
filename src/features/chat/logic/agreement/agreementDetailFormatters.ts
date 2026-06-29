import type {
  MerchandiseSectionMeta,
} from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import {
  minorToMajor,
  currencyMinorDecimals,
} from "@features/payments/logic/paymentFeePolicy";
import { normalizeCarrierEvidenceForCompare } from "@features/chat/logic/rail/carrier-evidence/normalizeCarrierEvidence";

export function fmtAgreementMoneyMinor(
  amountMinor: number,
  currencyLower: string,
): string {
  const cur = currencyLower.trim().toLowerCase();
  const pow = currencyMinorDecimals(cur);
  const maj = minorToMajor(amountMinor, cur);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur.toUpperCase(),
      maximumFractionDigits: pow,
    }).format(maj);
  } catch {
    return `${maj.toFixed(pow)} ${cur.toUpperCase()}`;
  }
}

export const normalizeEvidenceForCompare = normalizeCarrierEvidenceForCompare;

export function legacyMerchandiseMetaHasContent(
  m?: MerchandiseSectionMeta,
): boolean {
  if (!m) return false;
  return Object.values(m).some((v) => (v ?? "").trim() !== "");
}
