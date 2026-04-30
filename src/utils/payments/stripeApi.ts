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
  if (code === "already_paid") {
    return new Error("Ya existe un cobro exitoso para esa moneda.");
  }
  if (code === "not_found") {
    return new Error("No se encontró el acuerdo o no tenés acceso.");
  }
  if (code === "checkout_invalid" || code === "invalid_target" || code === "invalid_kind") {
    return new Error(msg || "No se pudo preparar el cobro.");
  }
  if (msg) return new Error(msg);
  return new Error(raw || `HTTP ${res.status}`);
}

export type StripeConfig = {
  enabled: boolean;
  publishableKey?: string;
  /** True si el servidor tiene VIBETRADE_SKIP_PAYMENT_INTENTS (o alias): no hay cobros reales en Stripe. */
  skipPaymentIntents?: boolean;
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
  /** País de emisión ISO-3166-1 alpha-2 (Stripe). */
  country?: string | null;
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

/** Valor de `kind` para cobrar un acuerdo: el servidor calcula el monto (subtotal checkout). */
export const STRIPE_PAYMENT_INTENT_KIND_AGREEMENT_CHECKOUT = "agreement_checkout" as const;

export type CreateStripePaymentIntentBody = {
  kind: typeof STRIPE_PAYMENT_INTENT_KIND_AGREEMENT_CHECKOUT;
  threadId: string;
  agreementId: string;
  currency: string;
  paymentMethodId: string;
  /** Si el acuerdo es solo servicios, mismas entradas que en checkout / execute. */
  selectedServicePayments?: Array<{
    serviceItemId: string;
    entryMonth: number;
    entryDay: number;
  }>;
};

export type CreateStripePaymentIntentResult = {
  clientSecret: string;
  /** Server chose not to create a Stripe PaymentIntent (e.g. VIBETRADE_SKIP_PAYMENT_INTENTS). */
  paymentSkipped?: boolean;
  /** Monto en unidades mínimas que aplicó el servidor (subtotal del desglose). */
  amountMinor?: number;
  currency?: string;
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
