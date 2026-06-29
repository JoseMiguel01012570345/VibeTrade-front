export type MerchandiseCurrencyResolution =
  | { ok: true; currency: string }
  | { ok: false; reason: "no_merchandise" | "missing" | "multiple" };

export type AgreementCurrencyResolution =
  | { ok: true; currency: string }
  | { ok: false; reason: "missing" | "multiple" | "route_mismatch" };
