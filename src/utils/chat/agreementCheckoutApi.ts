import { apiFetch } from "../http/apiClient";

export type AgreementCheckoutBasisLineApi = {
  category: string;
  label: string;
  currencyLower: string;
  amountMinor: number;
  routeSheetId?: string | null;
  routeStopId?: string | null;
};

export type AgreementCheckoutCurrencyTotalsApi = {
  currencyLower: string;
  subtotalMinor: number;
  climateMinor: number;
  stripeFeeMinor: number;
  totalMinor: number;
  lines: AgreementCheckoutBasisLineApi[];
};

export type AgreementCheckoutBreakdownApi = {
  ok: boolean;
  errors: string[];
  byCurrency: AgreementCheckoutCurrencyTotalsApi[];
};

export async function fetchAgreementCheckoutBreakdown(
  threadId: string,
  agreementId: string,
): Promise<AgreementCheckoutBreakdownApi> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/agreements/${encodeURIComponent(agreementId)}/checkout`,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as AgreementCheckoutBreakdownApi;
}

export type AgreementPaymentStatusApi = {
  currency: string;
  status: string;
  totalAmountMinor: number;
  stripePaymentIntentId: string;
  completedAtUtc: string | null;
};

export async function fetchAgreementPaymentStatuses(
  threadId: string,
  agreementId: string,
): Promise<AgreementPaymentStatusApi[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/agreements/${encodeURIComponent(agreementId)}/payments`,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as AgreementPaymentStatusApi[];
}

export type AgreementExecutePaymentResultApi = {
  paymentIntentId: string;
  succeeded: boolean;
  clientSecretForConfirmation?: string | null;
  stripeErrorMessage?: string | null;
  accepted: boolean;
  errorCode?: string | null;
  /** Presente cuando el cobro se persistió en esta llamada (no en replay idempotente). */
  agreementCurrencyPaymentId?: string | null;
};

export async function executeAgreementCurrencyPayment(args: {
  threadId: string;
  agreementId: string;
  currency: string;
  paymentMethodId: string;
  /** Reutilizar la misma clave entre reintentos del mismo cobro. */
  idempotencyKey?: string | null;
}): Promise<AgreementExecutePaymentResultApi> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const ik = args.idempotencyKey?.trim();
  if (ik && ik.length >= 8)
    headers["Idempotency-Key"] = ik;

  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/payments/execute`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        currency: args.currency.trim().toLowerCase(),
        paymentMethodId: args.paymentMethodId.trim(),
        idempotencyKey: ik ?? null,
      }),
    },
  );
  const parsed = (await res.json()) as AgreementExecutePaymentResultApi & {
    title?: string;
  };
  if (res.ok) return parsed;
  if (typeof parsed?.accepted === "boolean") return parsed;
  const fallback =
    typeof (parsed as unknown as { stripeErrorMessage?: unknown })
        ?.stripeErrorMessage === "string" ?
      ((parsed as unknown as { stripeErrorMessage: string }).stripeErrorMessage)
    : "";
  throw new Error(fallback || `HTTP ${res.status}`);
}
