import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage } from "@shared/services/http/apiErrorMessage";
import type {
  CheckoutPreviewResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderSummaryDto,
  OrderTrackingDto,
} from "../Dtos/orders";

async function throwFromResponse(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  throw new Error(apiErrorTextToUserMessage(text));
}

export async function previewCheckout(
  body: CreateOrderRequest,
): Promise<CheckoutPreviewResponse> {
  const res = await apiFetch("/api/v1/orders/preview", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as CheckoutPreviewResponse;
}

export async function createOrder(
  body: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  const res = await apiFetch("/api/v1/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as CreateOrderResponse;
}

export async function listMyOrders(): Promise<OrderSummaryDto[]> {
  const res = await apiFetch("/api/v1/orders/mine");
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as OrderSummaryDto[];
}

export async function trackOrder(publicNumber: string): Promise<OrderTrackingDto> {
  const res = await apiFetch(
    `/api/v1/orders/track/${encodeURIComponent(publicNumber.trim())}`,
  );
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as OrderTrackingDto;
}

export async function decideClientEvidence(
  orderId: string,
  accept: boolean,
  rejectReason?: string,
): Promise<OrderTrackingDto> {
  const res = await apiFetch(
    `/api/v1/orders/${encodeURIComponent(orderId)}/evidence-decision`,
    {
      method: "POST",
      body: JSON.stringify({ accept, rejectReason: rejectReason ?? null }),
    },
  );
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as OrderTrackingDto;
}
