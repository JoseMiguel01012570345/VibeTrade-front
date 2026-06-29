import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import type { MerchandiseSectionMeta, TradeAgreement, TradeAgreementDraft } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import {
  agreementDeclaresMerchandise,
  normalizeAgreementServices,
  normalizeMerchandiseLine,
} from "./tradeAgreementTypes";

export const MULTIPLE_AGREEMENT_CURRENCIES_ES =
  "El acuerdo debe cobrarse en una sola moneda; unifica mercadería, servicios y transporte.";

export const ROUTE_LEG_MUST_MATCH_AGREEMENT_CURRENCY_ES =
  "Los tramos deben usar la misma moneda de pago que el resto del acuerdo vinculado.";

/** @deprecated Use ROUTE_LEG_MUST_MATCH_AGREEMENT_CURRENCY_ES */
export const ROUTE_LEG_MUST_MATCH_MERCHANDISE_CURRENCY_ES =
  ROUTE_LEG_MUST_MATCH_AGREEMENT_CURRENCY_ES;

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

type MerchandiseCurrencyAgreementSlice = {
  includeMerchandise: boolean;
  merchandise: TradeAgreement["merchandise"];
  merchandiseMeta?: MerchandiseSectionMeta;
};

function agreementRouteSheetId(
  agreement: TradeAgreement | TradeAgreementDraft,
): string | undefined {
  if (!("routeSheetId" in agreement)) return undefined;
  const id = agreement.routeSheetId?.trim();
  return id || undefined;
}

function collectMerchandiseCurrencies(
  agreement: MerchandiseCurrencyAgreementSlice,
  out: Set<string>,
): void {
  if (!agreement.includeMerchandise) return;
  for (const raw of agreement.merchandise ?? []) {
    const line = normalizeMerchandiseLine(raw);
    const q = parseDecimal(line.cantidad);
    const vu = parseDecimal(line.valorUnitario);
    if ((q ?? 0) <= 0 || (vu ?? 0) <= 0) continue;
    const mon = isoNorm(line.moneda || agreement.merchandiseMeta?.moneda);
    if (mon) out.add(mon);
  }
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
  collectMerchandiseCurrencies(agreement, out);
  collectServiceCurrencies(agreement, out);
  if (
    agreementDeclaresMerchandise(agreement as TradeAgreement) &&
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
  if (
    agreementDeclaresMerchandise(agreement as TradeAgreement) &&
    routeSheet?.paradas?.length &&
    agreementRouteSheetId(agreement)
  ) {
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

/** Moneda única de mercadería cobrable (compat). */
export function resolveSingleMerchandiseCurrencyFromAgreement(
  agreement: MerchandiseCurrencyAgreementSlice,
): { ok: true; currency: string } | { ok: false; reason: "no_merchandise" | "missing" | "multiple" } {
  if (!agreement.includeMerchandise) {
    return { ok: false, reason: "no_merchandise" };
  }
  const set = new Set<string>();
  collectMerchandiseCurrencies(agreement, set);
  if (set.size === 0) return { ok: false, reason: "missing" };
  if (set.size > 1) return { ok: false, reason: "multiple" };
  return { ok: true, currency: [...set][0]! };
}

export function resolveRouteLegPaymentCurrencyForThread(
  agreements: TradeAgreement[],
  routeSheetId?: string | null,
): string | null {
  const rsId = routeSheetId?.trim();
  const acceptedMerch = agreements.filter(
    (a) => a.status === "accepted" && a.includeMerchandise,
  );
  if (acceptedMerch.length === 0) return null;

  const linked = rsId
    ? acceptedMerch.filter((a) => a.routeSheetId?.trim() === rsId)
    : [];
  const unlinked = acceptedMerch.filter((a) => !a.routeSheetId?.trim());
  const sources = linked.length > 0 ? linked : unlinked;
  if (sources.length === 0) return null;

  let currency: string | null = null;
  for (const a of sources) {
    const r = resolveSingleMerchandiseCurrencyFromAgreement(a);
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
