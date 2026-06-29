import type { TradeAgreement } from "@features/chat/model/tradeAgreementTypes";
import type { RouteSheet } from "@features/chat/model/routeSheetTypes";

export type ChatPaymentModalProps = {
  open: boolean;
  threadId: string;
  agreements: TradeAgreement[];
  /** Hojas de ruta del hilo (transporte vinculado al acuerdo). */
  routeSheets?: RouteSheet[];
  onClose: () => void;
  onPaymentFullySettled?: () => void;
};
