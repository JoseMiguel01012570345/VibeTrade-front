import type { AgreementServicePaymentApi } from "./agreementServiceEvidenceApiTypes";
import type { ServiceEvidenceAttachmentApi } from "./agreementServiceEvidenceApiTypes";
import type { SavedCard } from "@features/payments";

export type EvidenceModalState = {
  pay: AgreementServicePaymentApi;
  text: string;
  attachments: ServiceEvidenceAttachmentApi[];
  busy: boolean;
  uploading: boolean;
} | null;

export type SellerPayoutModalState = {
  pay: AgreementServicePaymentApi;
  cards: SavedCard[];
  selectedCardId: string;
  loadingCards: boolean;
  busy: boolean;
} | null;
