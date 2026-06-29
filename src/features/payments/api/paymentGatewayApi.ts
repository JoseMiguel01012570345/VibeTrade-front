import { apiFetch } from "@shared/services/http/apiClient";
import type {
  CreatePaymentIntentBody,
  CreatePaymentIntentResult,
} from "../Dtos/createPaymentIntent";
import type { CreateSetupIntentResult } from "../Dtos/createSetupIntent";
import type { PaymentGatewayConfig } from "../Dtos/paymentGatewayConfig";
import type { SavedCard } from "../Dtos/savedCard";
import { friendlyPaymentGatewayError } from "../logic/paymentGatewayErrors";

export async function getPaymentGatewayConfig(): Promise<PaymentGatewayConfig> {
  const res = await apiFetch("/api/v1/payments/gateway/config");
  if (!res.ok) throw await friendlyPaymentGatewayError(res);
  return (await res.json()) as PaymentGatewayConfig;
}

export async function listSavedCards(): Promise<SavedCard[]> {
  const res = await apiFetch("/api/v1/payments/gateway/payment-methods");
  if (!res.ok) throw await friendlyPaymentGatewayError(res);
  return (await res.json()) as SavedCard[];
}

export async function createSetupIntent(): Promise<CreateSetupIntentResult> {
  const res = await apiFetch("/api/v1/payments/gateway/setup-intents", {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await friendlyPaymentGatewayError(res);
  return (await res.json()) as CreateSetupIntentResult;
}

export async function createPaymentIntent(
  body: CreatePaymentIntentBody,
): Promise<CreatePaymentIntentResult> {
  const res = await apiFetch("/api/v1/payments/gateway/payment-intents", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await friendlyPaymentGatewayError(res);
  return (await res.json()) as CreatePaymentIntentResult;
}
