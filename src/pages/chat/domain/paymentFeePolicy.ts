/**
 * Políticas de cargo: climate (0.05%) y tarifa Stripe estimada.
 * Los porcentajes fijos están centralizados; el fijo puede variar por moneda ISO.
 */

const CLIMATE_RATE = 0.0005; // 0.05%

/** Monedas zero-decimal en Stripe (unidad principal = menor unidad Stripe). */
const ZERO_DECIMAL_CURRENCIES = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

function normCurrency(c: string): string {
  return c.trim().toLowerCase();
}

export function stripeMinorDecimals(currency: string): number {
  const c = normCurrency(currency);
  return ZERO_DECIMAL_CURRENCIES.has(c) ? 0 : 2;
}

export function majorToMinor(amountMajor: number, currency: string): number {
  const d = stripeMinorDecimals(currency);
  if (d === 0) return Math.round(amountMajor);
  return Math.round(amountMajor * 10 ** d);
}

/** Convierte unidades Stripe minor → texto major local (para etiquetas UI). */
export function minorToMajor(amountMinor: number, currency: string): number {
  const d = stripeMinorDecimals(currency);
  if (d === 0) return amountMinor;
  return amountMinor / 10 ** d;
}

/** Recargo Climate policy: 0.05 % del subtotal (minor units). */
export function climateMinorFromSubtotalMinor(
  subtotalMinor: number,
): number {
  if (subtotalMinor <= 0) return 0;
  const frac = CLIMATE_RATE * subtotalMinor;
  return Math.max(0, Math.ceil(frac - 1e-9));
}

/** Fijo Stripe en minor units aprox por moneda (centavos, etc.). */
function stripeFixedMinor(currency: string): number {
  const c = normCurrency(currency);
  if (c === "usd" || c === "eur" || c === "ars") return 30; // ejemplo estándar 0,30
  return 0;
}

/**
 * Cargo estimado de procesamiento: % sobre (subtotal + climate) más fijo mínimo.
 * Fórmula simple documentada para alinear cliente y servidor (no garantiza match exacto con liquidación Stripe).
 */
export function stripeFeeMinorEstimate(
  subtotalMinor: number,
  climateMinor: number,
  currency: string,
): number {
  const base = subtotalMinor + climateMinor;
  if (base <= 0) return 0;
  const pctPart = Math.ceil(base * 0.029 - 1e-9); // 2.9%
  const fix = stripeFixedMinor(currency);
  return pctPart + fix;
}

export const paymentFeeLabels = {
  climateRateDisplay: "0.05%",
  stripePctDisplay: "2.9%",
} as const;
