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
  processorFeeMinorActual: number;
  processorFeeMinorEstimated: number;
  totalChargedMinor: number;
  paymentFeePolicyUrl: string;
  lines: PaymentFeeReceiptLine[];
  /** Plataforma emisora del documento (p. ej. factura / informe). */
  invoiceIssuerPlatform: string;
  /** Tienda del chat (vendedor). */
  invoiceStoreName: string;
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
  const paymentFeePolicyUrl = pickStr(src, "paymentFeePolicyUrl", "paymentFeePolicyUrl");
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

  const invoiceIssuerPlatform =
    pickStr(src, "invoiceIssuerPlatform", "InvoiceIssuerPlatform") || "VibeTrade";
  const invoiceStoreName = pickStr(src, "invoiceStoreName", "InvoiceStoreName");

  return {
    agreementId,
    agreementTitle,
    paymentId,
    currencyLower,
    subtotalMinor: pickNum(src, "subtotalMinor", "SubtotalMinor"),
    climateMinor: pickNum(src, "climateMinor", "ClimateMinor"),
    processorFeeMinorActual: pickNum(src, "processorFeeMinorActual", "processorFeeMinorActual"),
    processorFeeMinorEstimated: pickNum(
      src,
      "processorFeeMinorEstimated",
      "processorFeeMinorEstimated",
    ),
    totalChargedMinor: pickNum(src, "totalChargedMinor", "TotalChargedMinor"),
    paymentFeePolicyUrl: paymentFeePolicyUrl || "",
    lines,
    invoiceIssuerPlatform,
    invoiceStoreName,
  };
}
