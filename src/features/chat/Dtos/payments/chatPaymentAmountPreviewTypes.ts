export type AgreementPaymentPreview =
  | {
      ok: true;
      agreementId: string;
      title: string;
      currency: string;
      amountMinor: number;
      summaryLines: string[];
    }
  | { ok: false; reason: string };
