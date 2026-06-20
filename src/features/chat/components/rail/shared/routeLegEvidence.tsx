import type { ServiceEvidenceAttachmentApi } from "@/utils/chat/agreementServiceEvidenceApi";
import { EvidenceAttachmentsList } from "../../shared/EvidenceAttachmentsList";

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

export function RouteLegEvidenceAttachmentsList({
  atts,
  onRemove,
}: {
  atts: ServiceEvidenceAttachmentApi[];
  onRemove?: (id: string) => void;
}) {
  return (
    <EvidenceAttachmentsList
      atts={atts}
      onRemove={onRemove}
    />
  );
}
