import { apiFetch } from "../http/apiClient";

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
  /** Stripe Transfer (tr_) o skipped_* en modo demo. */
  sellerPayoutStripeTransferId?: string | null;
};

export async function listAgreementServicePayments(
  threadId: string,
  agreementId: string,
): Promise<AgreementServicePaymentApi[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/agreements/${encodeURIComponent(agreementId)}/service-payments`,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as AgreementServicePaymentApi[];
}

export async function upsertServiceEvidence(args: {
  threadId: string;
  agreementId: string;
  paymentId: string;
  text: string;
  attachments: ServiceEvidenceAttachmentApi[];
  submit: boolean;
}): Promise<ServiceEvidenceApi> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/service-payments/${encodeURIComponent(args.paymentId)}/evidence`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: args.text,
        attachments: args.attachments,
        submit: args.submit,
      }),
    },
  );
  const parsed = (await res.json().catch(() => null)) as ServiceEvidenceApi | null;
  if (res.ok && parsed) return parsed;
  const msg =
    typeof (parsed as unknown as { message?: unknown })?.message === "string"
      ? ((parsed as unknown as { message: string }).message ?? "").trim()
      : "";
  const t = await res.text().catch(() => "");
  throw new Error(msg || t || `HTTP ${res.status}`);
}

export async function decideServiceEvidence(args: {
  threadId: string;
  agreementId: string;
  paymentId: string;
  decision: "accept" | "reject";
}): Promise<boolean> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/service-payments/${encodeURIComponent(args.paymentId)}/evidence/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: args.decision }),
    },
  );
  if (res.ok) return true;
  const t = await res.text().catch(() => "");
  throw new Error(t || `HTTP ${res.status}`);
}

export async function recordSellerServicePayout(args: {
  threadId: string;
  agreementId: string;
  paymentId: string;
  paymentMethodId: string;
}): Promise<boolean> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/service-payments/${encodeURIComponent(args.paymentId)}/seller-payout`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethodId: args.paymentMethodId.trim() }),
    },
  );
  if (res.ok) return true;
  const raw = await res.text().catch(() => "");
  let msg = "";
  try {
    const j = JSON.parse(raw) as {
      message?: unknown;
      detail?: unknown;
      title?: unknown;
    };
    if (typeof j?.message === "string") msg = j.message.trim();
    else if (typeof j?.detail === "string") msg = j.detail.trim();
    else if (typeof j?.title === "string") msg = j.title.trim();
  } catch {
    msg = "";
  }
  throw new Error(msg || raw.trim() || `HTTP ${res.status}`);
}
