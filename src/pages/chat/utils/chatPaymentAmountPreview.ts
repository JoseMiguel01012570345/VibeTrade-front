import type { TradeAgreement } from "../domain/tradeAgreementTypes";
import {
  DEFAULT_RECURRENCE_MONEDA,
  normalizeAgreementServices,
  normalizeServicePaymentRecurrence,
} from "../domain/tradeAgreementTypes";
import { parseDecimal } from "../domain/tradeAgreementValidation";

function normCurrency(raw: string | undefined): string {
  const t = (raw ?? "").trim().toUpperCase();
  return t || DEFAULT_RECURRENCE_MONEDA.toUpperCase();
}

/** Unidades mayores → unidad mínima Stripe (p. ej. USD/ARS: centavos). */
function toAmountMinor(totalMajor: number): number {
  const rounded = Math.round(totalMajor * 100);
  return Math.max(1, rounded);
}

export type AgreementPaymentPreview =
  | {
      ok: true;
      agreementId: string;
      title: string;
      currency: string;
      amountMinor: number;
      summaryLines: string[];
    }
  | { ok: false; reason: string };

/**
 * Monto a cobrar al comprador por un acuerdo aceptado:
 * - Mercancías: suma de cantidad × valor unitario por línea.
 * - Servicios: para cada ítem, el **primer** vencimiento de la recurrencia (mes/día más próximo en el calendario anual).
 */
export function previewPaymentForAcceptedAgreement(
  ag: TradeAgreement,
): AgreementPaymentPreview {
  if (ag.status !== "accepted") {
    return { ok: false, reason: "Solo podés pagar acuerdos aceptados." };
  }

  const buckets = new Map<string, number>();
  const summaryLines: string[] = [];

  const bump = (currencyRaw: string | undefined, delta: number) => {
    if (!Number.isFinite(delta) || delta <= 0) return;
    const k = normCurrency(currencyRaw);
    buckets.set(k, (buckets.get(k) ?? 0) + delta);
  };

  if (ag.includeMerchandise !== false) {
    for (const line of ag.merchandise ?? []) {
      const q = parseDecimal(line.cantidad);
      const vu = parseDecimal(line.valorUnitario);
      if (q === null || vu === null || q <= 0 || vu <= 0) continue;
      const sub = q * vu;
      bump(line.moneda, sub);
      const label = (line.tipo ?? "").trim() || "Producto";
      summaryLines.push(`${label}: ${q} × ${vu} → ${sub.toFixed(2)}`);
    }
  }

  const services = normalizeAgreementServices(ag);
  if (ag.includeService !== false) {
    for (const svc of services) {
      const r = normalizeServicePaymentRecurrence(
        svc.recurrenciaPagos,
        svc.moneda,
      );
      const entries = [...r.entries].filter((e) => {
        const a = parseDecimal(e.amount);
        return a !== null && a > 0;
      });
      if (entries.length === 0) continue;
      entries.sort((a, b) =>
        a.month !== b.month ? a.month - b.month : a.day - b.day,
      );
      const first = entries[0];
      const amt = parseDecimal(first.amount);
      if (amt === null || amt <= 0) continue;
      bump(first.moneda, amt);
      const svcLabel = (svc.tipoServicio ?? "").trim() || "Servicio";
      summaryLines.push(
        `${svcLabel} — 1.er pago programado (${first.day}/${first.month}): ${amt.toFixed(2)}`,
      );
    }
  }

  const positive = [...buckets.entries()].filter(([, v]) => v > 0);
  if (positive.length === 0) {
    return {
      ok: false,
      reason:
        "No se pudo calcular un monto (revisá precios en mercancías y montos en la recurrencia de servicios).",
    };
  }
  if (positive.length > 1) {
    return {
      ok: false,
      reason:
        "Este acuerdo mezcla monedas distintas en los montos a cobrar. Unificá la moneda en el acuerdo.",
    };
  }

  const [curUpper, totalMajor] = positive[0];
  const currency = curUpper.toLowerCase();

  return {
    ok: true,
    agreementId: ag.id,
    title: ag.title.trim() || "Acuerdo",
    currency,
    amountMinor: toAmountMinor(totalMajor),
    summaryLines,
  };
}
