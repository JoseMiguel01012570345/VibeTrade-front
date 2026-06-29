import { apiFetch } from "@shared/services/http/apiClient";
import type {
  AgreementCheckoutBreakdownApi,
  AgreementExecutePaymentResultApi,
  AgreementPaymentStatusApi,
  AgreementRoutePathsResponseApi,
} from "@features/chat/Dtos/agreement/agreementCheckoutApiTypes";

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
