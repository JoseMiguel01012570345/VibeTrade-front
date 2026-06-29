import type { Dispatch, SetStateAction } from "react";
import {
  BadgeCheck,
  Pencil,
  Upload,
  XCircle,
} from "lucide-react";
import { Button, Spinner } from "flowbite-react";
import type { RouteSheet } from "@features/chat/model/routeSheetTypes";
import {
  carrierEvidenceModalIsDirty,
  saveCarrierEvidenceDraft,
  submitCarrierEvidenceFromModal,
  uploadFilesForCarrierEvidenceModal,
} from "./carrierDeliveryEvidenceEditHandlers";
import type { CarrierEvEditModalState } from "../shared/routesRailSheetModalTypes";
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
  if (!modal) return null;
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

  const dirty = carrierEvidenceModalIsDirty(snap);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0 text-[13px] font-black text-[var(--text)]">
            Evidencia de entrega · tramo
          </div>
          <Button
            color="gray"
            disabled={snap.busy}
            size="sm"
            onClick={close}
          >
            <span className="inline-flex items-center gap-1.5">
              <XCircle className="h-4 w-4 shrink-0" aria-hidden /> Cerrar
            </span>
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
          <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
            Texto
          </div>
          <textarea
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-[13px] text-[var(--text)] outline-none"
            rows={6}
            value={snap.text}
            onChange={(e) =>
              setCarrierEvEditModal((m) =>
                m ? { ...m, text: e.target.value } : m,
              )
            }
            placeholder="Describe la entrega, número de guía, observaciones…"
            disabled={snap.busy}
          />
          <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
            Adjuntos
          </div>
          <p className="vt-muted mt-1 text-[12px]">
            Podés subir imágenes o documentos (igual que en pagos de servicios).
          </p>
          <RouteLegEvidenceAttachmentsList
            atts={snap.attachments}
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
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] px-3 py-2 text-[13px] font-semibold text-[var(--text)]">
            <Upload size={16} aria-hidden />
            Subir archivos
            {snap.uploading ? (
              <Spinner aria-hidden light size="sm" />
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
              disabled={snap.busy}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
          <Button
            className="[&>span]:gap-2"
            color="gray"
            disabled={snap.busy || !dirty}
            onClick={onSaveDraft}
          >
            <Pencil className="h-4 w-4 shrink-0" aria-hidden />
            Guardar borrador
          </Button>
          <Button
            className="[&>span]:gap-2"
            color="blue"
            disabled={snap.busy || !dirty}
            onClick={onSubmit}
          >
            <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
            Enviar evidencia
          </Button>
        </div>
      </div>
    </div>
  );
}
