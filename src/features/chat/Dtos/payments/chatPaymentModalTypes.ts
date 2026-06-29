import type { TradeAgreement } from "../agreement/tradeAgreementTypes";
import type { RouteSheet } from "../route-sheet/routeSheetTypes";

export type ChatPaymentModalProps = {
  open: boolean;
  threadId: string;
  agreements: TradeAgreement[];
  /** Hojas de ruta del hilo (transporte vinculado al acuerdo). */
  routeSheets?: RouteSheet[];
  onClose: () => void;
  onPaymentFullySettled?: () => void;
};
