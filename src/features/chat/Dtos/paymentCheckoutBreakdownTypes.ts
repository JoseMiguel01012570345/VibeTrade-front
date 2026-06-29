export type CheckoutLineCategory =
  | "merchandise"
  | "service_installment"
  | "route_leg";

export type CheckoutBasisLine = {
  category: CheckoutLineCategory;
  label: string;
  currency: string;
  /** Para agrupación y etiquetas PDF. */
  amountMajor: number;
  amountMinor: number;
  merchandiseIndex?: number;
  serviceIndex?: number;
  routeSheetId?: string;
  stopId?: string;
  tramoOrdinal?: number;
};

export type CheckoutCurrencyTotals = {
  currency: string;
  subtotalMinor: number;
  climateMinor: number;
  processorFeeMinor: number;
  totalMinor: number;
  lines: CheckoutBasisLine[];
};

export type PaymentCheckoutBreakdown = {
  basisLines: CheckoutBasisLine[];
  byCurrency: CheckoutCurrencyTotals[];
  errors: string[];
};
