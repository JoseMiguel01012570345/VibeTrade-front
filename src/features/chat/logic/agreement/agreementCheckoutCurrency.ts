import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import type { TradeAgreement, TradeAgreementDraft } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import { normalizeAgreementServices } from "./tradeAgreementTypes";

export const MULTIPLE_AGREEMENT_CURRENCIES_ES =
  "El acuerdo debe cobrarse en una sola moneda; unifica servicios y transporte.";

export const ROUTE_LEG_MUST_MATCH_AGREEMENT_CURRENCY_ES =
  "Los tramos deben usar la misma moneda de pago que el resto del acuerdo vinculado.";

import type { AgreementCurrencyResolution } from "@features/chat/Dtos/agreement/agreementCheckoutCurrencyTypes";

function parseDecimal(raw: string): number | null {
  const t = (raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

function isoNorm(c: string | undefined | null): string {
  const t = (c ?? "").trim().toUpperCase();
  if (t.length < 3 || t.length > 8) return "";
  return t.slice(0, 3);
}

function agreementRouteSheetId(
  agreement: TradeAgreement | TradeAgreementDraft,
): string | undefined {
  if (!("routeSheetId" in agreement)) return undefined;
  const id = agreement.routeSheetId?.trim();
  return id || undefined;
}

function collectServiceCurrencies(
  agreement: TradeAgreement | TradeAgreementDraft,
  out: Set<string>,
): void {
  if (!agreement.includeService) return;
  const services =
    agreement.services?.length
      ? agreement.services
      : normalizeAgreementServices(agreement as TradeAgreement);
  for (const sv of services) {
    if (!sv.configured) continue;
    for (const en of sv.recurrenciaPagos?.entries ?? []) {
      const amt = parseDecimal(en.amount);
      const mon = isoNorm(en.moneda);
      if ((amt ?? 0) > 0 && mon) out.add(mon);
    }
  }
}

function collectRouteCurrencies(
  routeSheet: RouteSheet | null | undefined,
  out: Set<string>,
): void {
  if (!routeSheet?.paradas?.length) return;
  const sheetCur = isoNorm(routeSheet.monedaPago);
  for (const p of routeSheet.paradas) {
    const amt = parseDecimal(p.precioTransportista ?? "");
    if ((amt ?? 0) <= 0) continue;
    const mon = isoNorm(p.monedaPago) || sheetCur;
    if (mon) out.add(mon);
  }
}

export function collectBillableAgreementCurrencies(
  agreement: TradeAgreement | TradeAgreementDraft,
  routeSheet?: RouteSheet | null,
): Set<string> {
  const out = new Set<string>();
  collectServiceCurrencies(agreement, out);
  if (
    agreementRouteSheetId(agreement) &&
    routeSheet?.id?.trim() === agreementRouteSheetId(agreement)
  ) {
    collectRouteCurrencies(routeSheet, out);
  }
  return out;
}

export function resolveSingleAgreementCurrency(
  agreement: TradeAgreement | TradeAgreementDraft,
  routeSheet?: RouteSheet | null,
): AgreementCurrencyResolution {
  const monedas = collectBillableAgreementCurrencies(agreement, routeSheet);
  if (monedas.size === 0) return { ok: false, reason: "missing" };
  if (monedas.size > 1) return { ok: false, reason: "multiple" };

  const currency = [...monedas][0]!;
  if (routeSheet?.paradas?.length && agreementRouteSheetId(agreement)) {
    const required = isoNorm(currency);
    for (const p of routeSheet.paradas) {
      const amt = parseDecimal(p.precioTransportista ?? "");
      if ((amt ?? 0) <= 0) continue;
      const mon =
        isoNorm(p.monedaPago) || isoNorm(routeSheet.monedaPago);
      if (mon && mon !== required) return { ok: false, reason: "route_mismatch" };
    }
  }

  return { ok: true, currency };
}

export function agreementSingleCurrencyError(
  agreement: TradeAgreement | TradeAgreementDraft,
  routeSheet?: RouteSheet | null,
): string | null {
  const r = resolveSingleAgreementCurrency(agreement, routeSheet);
  if (r.ok) return null;
  if (r.reason === "route_mismatch")
    return ROUTE_LEG_MUST_MATCH_AGREEMENT_CURRENCY_ES;
  if (r.reason === "multiple") return MULTIPLE_AGREEMENT_CURRENCIES_ES;
  return null;
}

/** Moneda única de servicio cobrable de un acuerdo. */
function resolveSingleServiceCurrencyFromAgreement(
  agreement: TradeAgreement,
): { ok: true; currency: string } | { ok: false } {
  const set = new Set<string>();
  collectServiceCurrencies(agreement, set);
  if (set.size !== 1) return { ok: false };
  return { ok: true, currency: [...set][0]! };
}

/**
 * Moneda con la que deben cobrarse los tramos de transporte de una hoja de ruta,
 * inferida desde los acuerdos aceptados del hilo (service-only). Devuelve `null`
 * si no hay una moneda única.
 */
export function resolveRouteLegPaymentCurrencyForThread(
  agreements: TradeAgreement[],
  routeSheetId?: string | null,
): string | null {
  const rsId = routeSheetId?.trim();
  const accepted = agreements.filter((a) => a.status === "accepted");
  if (accepted.length === 0) return null;

  const linked = rsId
    ? accepted.filter((a) => a.routeSheetId?.trim() === rsId)
    : [];
  const unlinked = accepted.filter((a) => !a.routeSheetId?.trim());
  const sources = linked.length > 0 ? linked : unlinked;
  if (sources.length === 0) return null;

  let currency: string | null = null;
  for (const a of sources) {
    const r = resolveSingleServiceCurrencyFromAgreement(a);
    if (!r.ok) return null;
    if (currency && currency !== r.currency) return null;
    currency = r.currency;
  }
  return currency;
}

export function applyRouteLegPaymentCurrencyToParadas<
  T extends { monedaPago?: string },
>(paradas: T[], currency: string): T[] {
  const mon = isoNorm(currency);
  if (!mon) return paradas;
  return paradas.map((p) => ({ ...p, monedaPago: mon }));
}
