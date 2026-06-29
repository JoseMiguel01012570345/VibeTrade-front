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

export type AgreementPaymentStatusApi = {
  currency: string;
  status: string;
  totalAmountMinor: number;
  gatewayTransactionId: string;
  completedAtUtc: string | null;
};

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
