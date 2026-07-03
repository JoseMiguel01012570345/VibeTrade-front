export type TrustGateState = "active" | "blocked";

export type TrustStatusDto = {
  trustScore: number;
  threshold: number;
  state: TrustGateState;
  interactionsEnabled: boolean;
  mensualidadRequired: boolean;
};

export type MensualidadPayRequest = {
  paymentMethod?: string | null;
  paymentReference?: string | null;
};

export type TrustHistoryItemApi = {
  id: string;
  at: string;
  delta: number;
  balanceAfter: number;
  reason: string;
};

export type MensualidadPayResponse = {
  success: boolean;
  status: TrustStatusDto;
  crossedThresholdUp: boolean;
  entry: TrustHistoryItemApi | null;
};
