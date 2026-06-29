import { apiFetch } from "@shared/services/http/apiClient";

export type AgreementCheckoutBasisLineApi = {
  category: string;
  label: string;
  currencyLower: string;
  amountMinor: number;
  routeSheetId?: string | null;
  routeStopId?: string | null;
  /** Presente en líneas de mercadería (desglose servidor). */
  merchandiseLineId?: string | null;
};

export type AgreementCheckoutCurrencyTotalsApi = {
  currencyLower: string;
  subtotalMinor: number;
  climateMinor: number;
  processorFeeMinor: number;
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
  opts?: {
    selectedServicePayments?: Array<{
      serviceItemId: string;
      entryKey: { month: number; day: number };
    }>;
    /**
     * `undefined` = no enviar (desglose GET legacy).
     * `null` o array = explícito en POST (array vacío = sin transporte).
     */
    selectedRoutePathIds?: string[] | null;
    /** Igual que rutas: solo POST cuando se define (mercadería explícita). */
    selectedMerchandiseLineIds?: string[] | null;
  },
): Promise<AgreementCheckoutBreakdownApi> {
  const picks = opts?.selectedServicePayments ?? [];
  const hasServicePicks = picks.length > 0;
  const routeExplicit = opts?.selectedRoutePathIds !== undefined;
  const merchExplicit = opts?.selectedMerchandiseLineIds !== undefined;
  const usePost = hasServicePicks || routeExplicit || merchExplicit;

  const res = usePost
    ? await apiFetch(
        `/api/v1/chat/threads/${encodeURIComponent(threadId)}/agreements/${encodeURIComponent(agreementId)}/checkout-breakdown`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedServicePayments: hasServicePicks
              ? picks.map((p) => ({
                  serviceItemId: p.serviceItemId,
                  entryMonth: p.entryKey.month,
                  entryDay: p.entryKey.day,
                }))
              : null,
            selectedRoutePathIds: routeExplicit
              ? (opts?.selectedRoutePathIds ?? null)
              : null,
            selectedMerchandiseLineIds: merchExplicit
              ? (opts?.selectedMerchandiseLineIds ?? null)
              : null,
          }),
        },
      )
    : await apiFetch(
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
  gatewayTransactionId: string;
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
  gatewayTransactionId: string;
  succeeded: boolean;
  clientSecretForConfirmation?: string | null;
  paymentErrorMessage?: string | null;
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
  selectedServicePayments?: Array<{
    serviceItemId: string;
    entryKey: { month: number; day: number };
  }>;
  selectedRoutePathIds?: string[] | null;
  selectedMerchandiseLineIds?: string[] | null;
}): Promise<AgreementExecutePaymentResultApi> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const ik = args.idempotencyKey?.trim();
  if (ik && ik.length >= 8) headers["Idempotency-Key"] = ik;

  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/payments/execute`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        currency: args.currency.trim().toLowerCase(),
        paymentMethodId: args.paymentMethodId.trim(),
        idempotencyKey: ik ?? null,
        selectedServicePayments: (args.selectedServicePayments ?? []).map(
          (p) => ({
            serviceItemId: p.serviceItemId,
            entryMonth: p.entryKey.month,
            entryDay: p.entryKey.day,
          }),
        ),
        selectedRoutePathIds:
          args.selectedRoutePathIds === undefined
            ? null
            : args.selectedRoutePathIds,
        selectedMerchandiseLineIds:
          args.selectedMerchandiseLineIds === undefined
            ? null
            : args.selectedMerchandiseLineIds,
      }),
    },
  );
  const parsed = (await res.json()) as AgreementExecutePaymentResultApi & {
    title?: string;
  };
  if (res.ok) return parsed;
  if (typeof parsed?.accepted === "boolean") return parsed;
  const fallback =
    typeof (parsed as unknown as { paymentErrorMessage?: unknown })
      ?.paymentErrorMessage === "string"
      ? (parsed as unknown as { paymentErrorMessage: string }).paymentErrorMessage
      : "";
  throw new Error(fallback || `HTTP ${res.status}`);
}

export type AgreementRoutePathStopApi = {
  routeStopId: string;
  orden: number;
  origen: string;
  destino: string;
  precioTransportista?: string | null;
  monedaPago?: string | null;
};

export type AgreementRoutePathCurrencyTotalApi = {
  currencyLower: string;
  amountMinor: number;
};

export type AgreementRoutePathApi = {
  routePathId: string;
  orden: number;
  label: string;
  stopIds: string[];
  stops: AgreementRoutePathStopApi[];
  totalsByCurrency: AgreementRoutePathCurrencyTotalApi[];
  payable: boolean;
  paid: boolean;
  partiallyPaid: boolean;
};

export type AgreementRoutePathsResponseApi = {
  routeSheetId: string;
  paths: AgreementRoutePathApi[];
};

export async function fetchAgreementRoutePaths(
  threadId: string,
  agreementId: string,
  routeSheetId: string,
): Promise<AgreementRoutePathsResponseApi> {
  const qs = new URLSearchParams({ routeSheetId: routeSheetId.trim() });
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/agreements/${encodeURIComponent(agreementId)}/route-paths?${qs}`,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as AgreementRoutePathsResponseApi;
}
