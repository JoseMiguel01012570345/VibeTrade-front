export type MerchandiseEvidenceAttachmentApi = {
  id: string;
  url: string;
  fileName: string;
  kind: string;
};

export type MerchandiseEvidenceApi = {
  id: string;
  sellerUserId: string;
  text: string;
  attachments: MerchandiseEvidenceAttachmentApi[];
  lastSubmittedText: string;
  lastSubmittedAttachments: MerchandiseEvidenceAttachmentApi[];
  lastSubmittedAtUtc: string | null;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  buyerDecisionAtUtc: string | null;
};

export type AgreementMerchandisePaymentApi = {
  id: string;
  merchandiseLineId: string;
  currencyLower: string;
  amountMinor: number;
  status: string;
  createdAtUtc: string;
  releasedAtUtc: string | null;
  evidence: MerchandiseEvidenceApi | null;
};
