import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage } from "@shared/services/http/apiErrorMessage";
import type { OrderSummaryDto } from "@features/orders/Dtos/orders";

async function throwFromResponse(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  throw new Error(apiErrorTextToUserMessage(text));
}

export async function listStoreOrders(storeId: string): Promise<OrderSummaryDto[]> {
  const res = await apiFetch(`/api/v1/stores/${encodeURIComponent(storeId)}/orders`);
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as OrderSummaryDto[];
}

export async function advanceOrder(orderId: string, toStatus: string): Promise<void> {
  const res = await apiFetch(`/api/v1/orders/${encodeURIComponent(orderId)}/advance`, {
    method: "POST",
    body: JSON.stringify({ toStatus }),
  });
  if (!res.ok) await throwFromResponse(res);
}

export async function uploadClientEvidence(
  orderId: string,
  urls: string[],
  note?: string,
): Promise<void> {
  const res = await apiFetch(`/api/v1/orders/${encodeURIComponent(orderId)}/client-evidence`, {
    method: "POST",
    body: JSON.stringify({ urls, note: note ?? null }),
  });
  if (!res.ok) await throwFromResponse(res);
}

export async function invalidateOrder(orderId: string, reason?: string): Promise<void> {
  const res = await apiFetch(`/api/v1/orders/${encodeURIComponent(orderId)}/invalidate`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });
  if (!res.ok) await throwFromResponse(res);
}
