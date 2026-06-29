import type { ServiceEvidenceAttachmentApi } from "@features/chat/Dtos/agreement/agreementServiceEvidenceApiTypes";
import { EvidenceAttachmentsList } from "../../shared/EvidenceAttachmentsList";

export { normalizeCarrierEvidenceForCompare } from "@features/chat/logic/rail/carrier-evidence/normalizeCarrierEvidence";

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
