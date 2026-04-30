export type PaymentFeeReceiptLine = {
  label: string;
  amountMinor: number;
};

export type PaymentFeeReceiptPayload = {
  agreementId: string;
  agreementTitle: string;
  paymentId: string;
  currencyLower: string;
  subtotalMinor: number;
  climateMinor: number;
  stripeFeeMinorActual: number;
  stripeFeeMinorEstimated: number;
  totalChargedMinor: number;
  stripePricingUrl: string;
  lines: PaymentFeeReceiptLine[];
};

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickNum(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

/** Une payload plano API + posible nodo anidado (p. ej. workspace / refetch). */
function flattenPaymentFeeReceiptSource(
  p: Record<string, unknown>,
): Record<string, unknown> {
  const nested = p.paymentFeeReceipt;
  const base =
    nested && typeof nested === "object" ?
      { ...(nested as Record<string, unknown>), ...p }
    : { ...p };
  const out = { ...base };
  delete out.paymentFeeReceipt;
  delete out.type;
  return out;
}

export function parsePaymentFeeReceiptPayload(
  p: Record<string, unknown>,
): PaymentFeeReceiptPayload | null {
  const src = flattenPaymentFeeReceiptSource(p);

  const agreementId = pickStr(src, "agreementId", "AgreementId");
  const agreementTitle = pickStr(src, "agreementTitle", "AgreementTitle");
  const paymentId = pickStr(src, "paymentId", "PaymentId");
  const currencyLower = pickStr(
    src,
    "currencyLower",
    "CurrencyLower",
  ).toLowerCase();
  const stripePricingUrl = pickStr(src, "stripePricingUrl", "StripePricingUrl");
  if (!agreementId || !paymentId || !currencyLower) return null;

  const rawLines = src.lines ?? src.Lines;
  const lines: PaymentFeeReceiptLine[] = [];
  if (Array.isArray(rawLines)) {
    for (const row of rawLines) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const label = pickStr(o, "label", "Label");
      const amountMinor = pickNum(o, "amountMinor", "AmountMinor");
      lines.push({ label, amountMinor });
    }
  }

  return {
    agreementId,
    agreementTitle,
    paymentId,
    currencyLower,
    subtotalMinor: pickNum(src, "subtotalMinor", "SubtotalMinor"),
    climateMinor: pickNum(src, "climateMinor", "ClimateMinor"),
    stripeFeeMinorActual: pickNum(src, "stripeFeeMinorActual", "StripeFeeMinorActual"),
    stripeFeeMinorEstimated: pickNum(
      src,
      "stripeFeeMinorEstimated",
      "StripeFeeMinorEstimated",
    ),
    totalChargedMinor: pickNum(src, "totalChargedMinor", "TotalChargedMinor"),
    stripePricingUrl: stripePricingUrl || "https://stripe.com/pricing",
    lines,
  };
}
