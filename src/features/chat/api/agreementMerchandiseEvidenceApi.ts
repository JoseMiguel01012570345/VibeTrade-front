import { apiFetch } from "@shared/services/http/apiClient";
import type {
  AgreementMerchandisePaymentApi,
  MerchandiseEvidenceApi,
  MerchandiseEvidenceAttachmentApi,
} from "@features/chat/Dtos/agreement/agreementMerchandiseEvidenceApiTypes";

export const ROUTE_NOT_DELIVERED_FOR_MERCH_EVIDENCE_ES =
  "La hoja de ruta vinculada aún no está entregada; presentá la evidencia cuando el recorrido haya finalizado.";

export async function listAgreementMerchandisePayments(
  threadId: string,
  agreementId: string,
): Promise<AgreementMerchandisePaymentApi[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/agreements/${encodeURIComponent(agreementId)}/merchandise-line-payments`,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as AgreementMerchandisePaymentApi[];
}

export async function upsertMerchandiseEvidence(args: {
  threadId: string;
  agreementId: string;
  paymentId: string;
  text: string;
  attachments: MerchandiseEvidenceAttachmentApi[];
  submit: boolean;
}): Promise<MerchandiseEvidenceApi> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/merchandise-line-payments/${encodeURIComponent(args.paymentId)}/evidence`,
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
  const parsed = (await res.json().catch(() => null)) as MerchandiseEvidenceApi | null;
  if (res.ok && parsed) return parsed;
  const msg =
    typeof (parsed as unknown as { message?: unknown })?.message === "string"
      ? ((parsed as unknown as { message: string }).message ?? "").trim()
      : "";
  const t = await res.text().catch(() => "");
  throw new Error(msg || t || `HTTP ${res.status}`);
}

export async function decideMerchandiseEvidence(args: {
  threadId: string;
  agreementId: string;
  paymentId: string;
  decision: "accept" | "reject";
}): Promise<boolean> {
  const apiDecision = args.decision === "accept" ? "accepted" : "rejected";
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/merchandise-line-payments/${encodeURIComponent(args.paymentId)}/evidence/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: apiDecision }),
    },
  );
  if (res.ok) return true;
  const t = await res.text().catch(() => "");
  throw new Error(t || `HTTP ${res.status}`);
}
