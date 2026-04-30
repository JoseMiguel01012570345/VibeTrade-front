import { parseDecimal } from "./tradeAgreementValidation";
import {
  climateMinorFromSubtotalMinor,
  majorToMinor,
  minorToMajor,
  stripeFeeMinorEstimate,
  stripeMinorDecimals,
} from "./paymentFeePolicy";
import type { RouteSheet } from "./routeSheetTypes";
import type { TradeAgreement } from "./tradeAgreementTypes";
import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  normalizeAgreementServices,
  normalizeMerchandiseLine,
} from "./tradeAgreementTypes";

export type CheckoutLineCategory =
  | "merchandise"
  | "service_installment"
  | "route_leg";

export type CheckoutBasisLine = {
  category: CheckoutLineCategory;
  label: string;
  currency: string;
  /** Para agrupación y etiquetas PDF. */
  amountMajor: number;
  amountMinor: number;
  merchandiseIndex?: number;
  serviceIndex?: number;
  routeSheetId?: string;
  stopId?: string;
  tramoOrdinal?: number;
};

export type CheckoutCurrencyTotals = {
  currency: string;
  subtotalMinor: number;
  climateMinor: number;
  stripeFeeMinor: number;
  totalMinor: number;
  lines: CheckoutBasisLine[];
};

export type PaymentCheckoutBreakdown = {
  basisLines: CheckoutBasisLine[];
  byCurrency: CheckoutCurrencyTotals[];
  errors: string[];
};

function isoNorm(c: string | undefined): string {
  const t = (c ?? "").trim().toUpperCase();
  if (t.length < 3 || t.length > 8) return "";
  return t.slice(0, 3);
}

/** Parse yyyy-mm-dd a Date UTC mediodía (evitar DST). */
function parseIsoDateUtc(s: string): Date | null {
  const t = (s ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d))
    return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return Number.isFinite(dt.getTime()) ? dt : null;
}

/**
 * Primera cuota dentro de la vigencia: menor timestamp válido sobre (mes,día).
 * Sin vigencia parseable → orden léxico (month, day).
 */
export function pickFirstPaymentEntryInsideVigencia(
  startDate: string,
  endDate: string,
  entries: readonly { month: number; day: number; amount: string; moneda: string }[],
): (typeof entries)[0] | null {
  if (!entries.length) return null;
  const vigStart = parseIsoDateUtc(startDate);
  const vigEnd = parseIsoDateUtc(endDate);
  let bestTs = Infinity;
  let chosen: (typeof entries)[0] | null = null;

  const hasRange =
    vigStart !== null &&
    vigEnd !== null &&
    vigStart.getTime() <= vigEnd.getTime();

  if (hasRange && vigStart && vigEnd) {
    const y0 = vigStart.getUTCFullYear();
    const y1 = vigEnd.getUTCFullYear();
    for (const en of entries) {
      for (let y = y0; y <= y1; y++) {
        const ts = Date.UTC(y, en.month - 1, en.day);
        if (ts < vigStart.getTime() || ts > vigEnd.getTime()) continue;
        if (ts < bestTs) {
          bestTs = ts;
          chosen = en;
        }
      }
    }
    if (chosen) return chosen;
  }

  const sorted = [...entries].sort((a, b) =>
    a.month !== b.month ? a.month - b.month : a.day - b.day,
  );
  return sorted[0] ?? null;
}

function pushLineBucket(
  out: Map<
    string,
    { currency: string; lines: CheckoutBasisLine[]; subtotalMinor: number }
  >,
  line: Omit<CheckoutBasisLine, "amountMinor"> & { currency: string; amountMajor: number },
): void {
  const curKey = isoNorm(line.currency);
  if (!curKey) return;
  const cur = curKey.toLowerCase();
  const minor = majorToMinor(line.amountMajor, cur);
  if (minor <= 0 || !Number.isFinite(minor)) return;
  const full: CheckoutBasisLine = {
    ...line,
    currency: cur,
    amountMinor: minor,
  };
  let b = out.get(cur);
  if (!b) {
    b = { currency: cur, lines: [], subtotalMinor: 0 };
    out.set(cur, b);
  }
  b.lines.push(full);
  b.subtotalMinor += minor;
}

/**
 * Calcula líneas por moneda desde acuerdo + hoja opcional (misma lógica que servidor debe replicar).
 */
export function buildPaymentCheckoutBreakdown(
  agreement: TradeAgreement,
  routeSheet: RouteSheet | null | undefined,
): PaymentCheckoutBreakdown {
  const errors: string[] = [];
  const bucket = new Map<
    string,
    { currency: string; lines: CheckoutBasisLine[]; subtotalMinor: number }
  >();

  if (agreement.status !== "accepted") {
    errors.push("El acuerdo debe estar aceptado para calcular el pago.");
    return {
      basisLines: [],
      byCurrency: [],
      errors,
    };
  }

  if (agreementDeclaresMerchandise(agreement)) {
    agreement.merchandise.forEach((raw, i) => {
      const line = normalizeMerchandiseLine(raw);
      const q = parseDecimal(line.cantidad);
      const vu = parseDecimal(line.valorUnitario);
      const mon = isoNorm(line.moneda || agreement.merchandiseMeta?.moneda);
      if ((q ?? 0) <= 0 || (vu ?? 0) <= 0) return;
      if (!mon)
        errors.push(`Mercancía ${i + 1}: falta código de moneda.`);
      if (!mon) return;
      pushLineBucket(bucket, {
        category: "merchandise",
        label:
          `${line.tipo || "Producto"} (× ${line.cantidad})`.slice(0, 200),
        currency: mon,
        amountMajor: q! * vu!,
        merchandiseIndex: i,
      });
    });
  }

  if (agreementDeclaresService(agreement)) {
    const services = normalizeAgreementServices(agreement);
    services.forEach((sv, svcIndex) => {
      if (!sv.configured) return;
      const entries = sv.recurrenciaPagos.entries;
      if (!entries.length) return;
      const picked = pickFirstPaymentEntryInsideVigencia(
        sv.tiempo?.startDate ?? "",
        sv.tiempo?.endDate ?? "",
        entries as { month: number; day: number; amount: string; moneda: string }[],
      );
      if (!picked) return;
      const amt = parseDecimal(picked.amount);
      const mon = isoNorm(picked.moneda);
      if ((amt ?? 0) <= 0 || !mon) return;
      pushLineBucket(bucket, {
        category: "service_installment",
        label: `Primera cuota — ${sv.tipoServicio || `Servicio ${svcIndex + 1}`}`.slice(0, 200),
        currency: mon,
        amountMajor: amt!,
        serviceIndex: svcIndex,
      });
    });
  }

  const subtotalMerchOrServiceMinor = [...bucket.values()].reduce(
    (s, b) => s + b.subtotalMinor,
    0,
  );

  const linkId = agreement.routeSheetId?.trim() ?? "";
  const rsMatch =
    linkId && routeSheet?.id?.trim() === linkId ? routeSheet : null;

  if (linkId && rsMatch) {
    const paradas = [...(rsMatch.paradas ?? [])].sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
    );
    paradas.forEach((p, idx) => {
      const amt = parseDecimal(p.precioTransportista ?? "");
      const sheetCur = isoNorm(rsMatch.monedaPago);
      const mono = isoNorm(p.monedaPago) || sheetCur;
      if ((amt ?? 0) <= 0 || !mono) return;
      const from = p.origen || "?";
      const to = p.destino || "?";
      const legLabel = `Transporte — tramo ${String(idx + 1)}: ${from} → ${to}`.slice(0, 220);
      pushLineBucket(bucket, {
        category: "route_leg",
        label: legLabel,
        currency: mono,
        amountMajor: amt as number,
        routeSheetId: rsMatch.id,
        stopId: p.id?.trim(),
        tramoOrdinal: idx + 1,
      });
    });
  } else if (
    linkId.length > 0 &&
    !routeSheet &&
    subtotalMerchOrServiceMinor <= 0
  ) {
    errors.push("Hoja de ruta vinculada no cargada en el cliente.");
  } else if (
    linkId.length > 0 &&
    routeSheet &&
    routeSheet.id?.trim() !== linkId &&
    subtotalMerchOrServiceMinor <= 0
  ) {
    errors.push(
      "El id de la hoja de ruta no coincide con el acuerdo; recarga el chat.",
    );
  }

  const basisLines = [...bucket.values()].flatMap((b) => b.lines);
  const byCurrency: CheckoutCurrencyTotals[] = [];

  bucket.forEach((b) => {
    const currency = b.currency.toLowerCase();
    const climate = climateMinorFromSubtotalMinor(b.subtotalMinor, currency);
    const stripeFee = stripeFeeMinorEstimate(b.subtotalMinor, climate, currency);
    const total = b.subtotalMinor + climate + stripeFee;
    byCurrency.push({
      currency,
      subtotalMinor: b.subtotalMinor,
      climateMinor: climate,
      stripeFeeMinor: stripeFee,
      totalMinor: total,
      lines: [...b.lines],
    });
  });

  byCurrency.sort((a, b) => a.currency.localeCompare(b.currency));

  if (byCurrency.length === 0 && errors.length === 0) {
    errors.push("No hay importes para cobrar en este acuerdo.");
  }

  return { basisLines, byCurrency, errors };
}

export function formatMoneyMajorFromMinor(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: stripeMinorDecimals(currency),
      maximumFractionDigits: stripeMinorDecimals(currency),
    }).format(minorToMajor(amountMinor, currency));
  } catch {
    const m = stripeMinorDecimals(currency);
    return `${(amountMinor / 10 ** m).toFixed(m)} ${currency.toUpperCase()}`;
  }
}
