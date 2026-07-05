import type { Dispatch, SetStateAction } from "react";
import { BadgeCheck, Pencil, Upload } from "lucide-react";
import { CeButton, CeModal, CeSpinner } from "@shared/components/ui";
import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import {
  carrierEvidenceModalIsDirty,
  saveCarrierEvidenceDraft,
  submitCarrierEvidenceFromModal,
  uploadFilesForCarrierEvidenceModal,
} from "@features/chat/logic/rail/carrier-evidence/carrierDeliveryEvidenceEditHandlers";
import type { CarrierEvEditModalState } from "@features/chat/Dtos/rail/routesRailTypes";
import { RouteLegEvidenceAttachmentsList } from "../shared/routeLegEvidence";

type Props = {
  modal: CarrierEvEditModalState | null;
  selRoute: RouteSheet;
  threadId: string;
  agreementId: string;
  setCarrierEvEditModal: Dispatch<
    SetStateAction<CarrierEvEditModalState | null>
  >;
  refreshDeliveriesForAgreement: (agreementId: string) => Promise<void>;
};

/** Modal de edición de evidencia de entrega por tramo (overlay). */
export function CarrierDeliveryEvidenceEditModal({
  modal,
  selRoute,
  threadId,
  agreementId,
  setCarrierEvEditModal,
  refreshDeliveriesForAgreement,
}: Props) {
  const snap = modal;

  function close(): void {
    setCarrierEvEditModal(null);
  }

  function onFilesSelected(files: File[]): void {
    const aid = agreementId.trim();
    if (aid.length < 8) return;
    void uploadFilesForCarrierEvidenceModal({
      files,
      setModal: setCarrierEvEditModal,
    });
  }

  function onSaveDraft(): void {
    if (!snap) return;
    void saveCarrierEvidenceDraft({
      threadId,
      routeSheetId: selRoute.id,
      agreementId,
      m: snap,
      setModal: setCarrierEvEditModal,
      refreshDeliveriesForAgreement,
      onClose: close,
    });
  }

  function onSubmit(): void {
    if (!snap) return;
    void submitCarrierEvidenceFromModal({
      threadId,
      routeSheetId: selRoute.id,
      agreementId,
      m: snap,
      setModal: setCarrierEvEditModal,
      refreshDeliveriesForAgreement,
      onClose: close,
    });
  }

  const dirty = snap ? carrierEvidenceModalIsDirty(snap) : false;

  return (
    <CeModal
      show={modal != null}
      onClose={() => !snap?.busy && close()}
      title="Evidencia de entrega · tramo"
      size="2xl"
      bodyClassName="pt-2"
      footer={
        <>
          <CeButton
            color="gray"
            outline
            disabled={snap?.busy || !dirty}
            onClick={onSaveDraft}
          >
            <Pencil className="h-4 w-4 shrink-0" aria-hidden />
            Guardar borrador
          </CeButton>
          <CeButton
            color="blue"
            disabled={snap?.busy || !dirty}
            loading={snap?.busy}
            onClick={onSubmit}
          >
            <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
            Enviar evidencia
          </CeButton>
        </>
      }
    >
      <div className="text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Texto
      </div>
      <textarea
        className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        rows={6}
        value={snap?.text ?? ""}
        onChange={(e) =>
          setCarrierEvEditModal((m) =>
            m ? { ...m, text: e.target.value } : m,
          )
        }
        placeholder="Describe la entrega, número de guía, observaciones…"
        disabled={snap?.busy}
      />
      <div className="mt-3 text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Adjuntos
      </div>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        Podés subir imágenes o documentos (igual que en pagos de servicios).
      </p>
      <RouteLegEvidenceAttachmentsList
        atts={snap?.attachments ?? []}
        onRemove={(id) =>
          setCarrierEvEditModal((m) =>
            m
              ? {
                  ...m,
                  attachments: m.attachments.filter((a) => a.id !== id),
                }
              : m,
          )
        }
      />
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        <Upload size={16} aria-hidden />
        Subir archivos
        {snap?.uploading ? (
          <CeSpinner size="sm" aria-label="Subiendo archivos" />
        ) : null}
        <input
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (!files.length) return;
            onFilesSelected(files);
          }}
          disabled={snap?.busy}
        />
      </label>
    </CeModal>
  );
}
