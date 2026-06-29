import type { ServiceEvidenceAttachmentApi } from "@features/chat/Dtos/agreement/agreementServiceEvidenceApiTypes";

export function normalizeCarrierEvidenceForCompare(
  text: string,
  atts: ServiceEvidenceAttachmentApi[],
): { text: string; attsKey: string } {
  const t = (text ?? "").trim();
  const key = (atts ?? [])
    .map((a) => ({
      url: (a.url ?? "").trim(),
      fileName: (a.fileName ?? "").trim(),
      kind: (a.kind ?? "").trim(),
    }))
    .sort((a, b) =>
      `${a.url}|${a.fileName}|${a.kind}`.localeCompare(
        `${b.url}|${b.fileName}|${b.kind}`,
        "es",
      ),
    )
    .map((a) => `${a.url}|${a.fileName}|${a.kind}`)
    .join(";;");
  return { text: t, attsKey: key };
}

/** @deprecated Usar normalizeCarrierEvidenceForCompare */
export const normalizeEvidenceForCompare = normalizeCarrierEvidenceForCompare;
