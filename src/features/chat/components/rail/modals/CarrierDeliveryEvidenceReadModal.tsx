import type { ReactNode } from "react";
import { CeModal } from "@shared/components/ui";
import { RouteLegEvidenceAttachmentsList } from "../shared/routeLegEvidence";
import type { ServiceEvidenceAttachmentApi } from "@features/chat/Dtos/agreement/agreementServiceEvidenceApiTypes";

export function CarrierDeliveryEvidenceReadModal(props: {
  open: boolean;
  onDismiss: () => void;
  statusLabel: ReactNode;
  bodyText: string;
  attachments: ServiceEvidenceAttachmentApi[];
  footer?: ReactNode;
}) {
  return (
    <CeModal
      show={props.open}
      onClose={props.onDismiss}
      title="Evidencia de entrega"
      size="4xl"
      bodyClassName="pt-2"
      footer={props.footer}
    >
      <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
        {props.statusLabel}
      </div>
      <div className="text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Último envío
      </div>
      <div className="mt-1 whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        {props.bodyText || "—"}
      </div>
      <div className="mt-3 text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Adjuntos enviados
      </div>
      <RouteLegEvidenceAttachmentsList atts={props.attachments} />
    </CeModal>
  );
}
