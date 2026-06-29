import type { TradeAgreement } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import {
  statusPillNo,
  statusPillOk,
  statusPillPending,
} from "@shared/styles/modals/formModalStyles";

export function contractStatusLabel(s: TradeAgreement["status"]) {
  switch (s) {
    case "pending_buyer":
      return "Pendiente";
    case "accepted":
      return "Aceptado";
    case "rejected":
      return "Rechazado";
    case "deleted":
      return "Eliminado";
    default:
      return s;
  }
}

export function contractStatusClass(s: TradeAgreement["status"]) {
  switch (s) {
    case "pending_buyer":
      return statusPillPending;
    case "accepted":
      return statusPillOk;
    case "rejected":
      return statusPillNo;
    case "deleted":
      return statusPillNo;
    default:
      return "";
  }
}
