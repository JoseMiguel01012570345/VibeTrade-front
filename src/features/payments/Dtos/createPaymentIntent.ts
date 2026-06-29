import type { PAYMENT_INTENT_KIND_AGREEMENT_CHECKOUT } from "../logic/paymentIntentKind";

export type PaymentIntentServiceSelection = {
  serviceItemId: string;
  entryMonth: number;
  entryDay: number;
};

export type CreatePaymentIntentBody = {
  kind: typeof PAYMENT_INTENT_KIND_AGREEMENT_CHECKOUT;
  threadId: string;
  agreementId: string;
  currency: string;
  paymentMethodId: string;
  selectedServicePayments?: PaymentIntentServiceSelection[];
  selectedRoutePathIds?: string[] | null;
};

export type CreatePaymentIntentResult = {
  clientSecret: string;
  paymentSkipped?: boolean;
  amountMinor?: number;
  currency?: string;
};
