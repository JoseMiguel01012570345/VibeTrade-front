import { apiFetch } from "../http/apiClient";

type ApiErrorBody = { error?: string; message?: string };

async function friendlyError(res: Response): Promise<Error> {
  const raw = await res.text().catch(() => "");
  let parsed: ApiErrorBody | null = null;
  try {
    parsed = raw ? (JSON.parse(raw) as ApiErrorBody) : null;
  } catch {
    parsed = null;
  }
  const code = (parsed?.error ?? "").trim();
  const msg = (parsed?.message ?? "").trim();
  if (code === "stripe_not_configured") {
    return new Error("Pagos con tarjeta no están disponibles ahora. Prueba más tarde.");
  }
  if (code === "missing_payment_method") {
    return new Error("Selecciona una tarjeta para pagar.");
  }
  if (code === "payment_method_not_owned") {
    return new Error("La tarjeta seleccionada no pertenece a tu cuenta.");
  }
  if (msg) return new Error(msg);
  return new Error(raw || `HTTP ${res.status}`);
}

export type StripeConfig = {
  enabled: boolean;
  publishableKey?: string;
};

export async function getStripeConfig(): Promise<StripeConfig> {
  const res = await apiFetch("/api/v1/payments/stripe/config");
  if (!res.ok) throw await friendlyError(res);
  return (await res.json()) as StripeConfig;
}

export type StripeSavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export async function listStripeCards(): Promise<StripeSavedCard[]> {
  const res = await apiFetch("/api/v1/payments/stripe/payment-methods");
  if (!res.ok) throw await friendlyError(res);
  return (await res.json()) as StripeSavedCard[];
}

export type CreateStripeSetupIntentResult = {
  clientSecret: string;
};

export async function createStripeSetupIntent(): Promise<CreateStripeSetupIntentResult> {
  const res = await apiFetch("/api/v1/payments/stripe/setup-intents", {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await friendlyError(res);
  return (await res.json()) as CreateStripeSetupIntentResult;
}

export type CreateStripePaymentIntentBody = {
  amountMinor: number;
  currency: string;
  description?: string;
  paymentMethodId: string;
};

export type CreateStripePaymentIntentResult = {
  clientSecret: string;
  /** Server chose not to create a Stripe PaymentIntent (e.g. VIBETRADE_SKIP_PAYMENT_INTENTS). */
  paymentSkipped?: boolean;
};

export async function createStripePaymentIntent(
  body: CreateStripePaymentIntentBody,
): Promise<CreateStripePaymentIntentResult> {
  const res = await apiFetch("/api/v1/payments/stripe/payment-intents", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await friendlyError(res);
  return (await res.json()) as CreateStripePaymentIntentResult;
}

