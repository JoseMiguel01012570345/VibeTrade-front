export type ServiceEvidenceAttachmentApi = {
  id: string;
  url: string;
  fileName: string;
  kind: string;
};

export type ServiceEvidenceApi = {
  id: string;
  sellerUserId: string;
  text: string;
  attachments: ServiceEvidenceAttachmentApi[];
  lastSubmittedText: string;
  lastSubmittedAttachments: ServiceEvidenceAttachmentApi[];
  lastSubmittedAtUtc: string | null;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  buyerDecisionAtUtc: string | null;
};

export type AgreementServicePaymentApi = {
  id: string;
  serviceItemId: string;
  entryMonth: number;
  entryDay: number;
  currencyLower: string;
  amountMinor: number;
  status: string;
  createdAtUtc: string;
  releasedAtUtc: string | null;
  evidence: ServiceEvidenceApi | null;
  /** Presente después de registrar el destino del depósito (vendedor). */
  sellerPayoutRecordedAtUtc?: string | null;
  sellerPayoutCardBrand?: string | null;
  sellerPayoutCardLast4?: string | null;
  /** Transferencia (tr_) o skipped_* en modo demo. */
  sellerPayoutTransferId?: string | null;
};
