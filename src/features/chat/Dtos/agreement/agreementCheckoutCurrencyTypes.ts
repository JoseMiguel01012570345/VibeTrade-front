export type AgreementCurrencyResolution =
  | { ok: true; currency: string }
  | { ok: false; reason: "missing" | "multiple" | "route_mismatch" };
