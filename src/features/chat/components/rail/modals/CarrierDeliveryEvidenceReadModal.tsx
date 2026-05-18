import type { ReactNode } from "react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "flowbite-react";
import { cn } from "@shared/lib/cn";
import { RouteLegEvidenceAttachmentsList } from "../shared/routeLegEvidence";
import type { ServiceEvidenceAttachmentApi } from "@/utils/chat/agreementServiceEvidenceApi";

export function CarrierDeliveryEvidenceReadModal(props: {
  open: boolean;
  onDismiss: () => void;
  statusLabel: ReactNode;
  bodyText: string;
  attachments: ServiceEvidenceAttachmentApi[];
  footer?: ReactNode;
}) {
  const root = typeof document !== "undefined" ? document.body : undefined;

  return (
    <Modal
      dismissible
      position="center"
      root={root}
      show={props.open}
      size="4xl"
      onClose={props.onDismiss}
      className={cn("!z-[85]")}
    >
      <ModalHeader>Evidencia de entrega</ModalHeader>
      <ModalBody>
        <div className="vt-muted mb-3 text-[12px]">{props.statusLabel}</div>
        <div className="text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Último envío
        </div>
        <div className="mt-1 whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-3 text-[13px] text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
          {props.bodyText || "—"}
        </div>
        <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Adjuntos enviados
        </div>
        <RouteLegEvidenceAttachmentsList atts={props.attachments} />
      </ModalBody>
      {props.footer !== undefined ? (
        <ModalFooter className="flex-wrap justify-end gap-2 border-gray-200 dark:border-gray-600">
          {props.footer}
        </ModalFooter>
      ) : null}
    </Modal>
  );
}
