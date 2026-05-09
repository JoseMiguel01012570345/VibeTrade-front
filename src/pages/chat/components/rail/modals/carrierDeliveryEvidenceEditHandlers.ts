import toast from "react-hot-toast";
import type { ServiceEvidenceAttachmentApi } from "../../../../../utils/chat/agreementServiceEvidenceApi";
import { upsertCarrierDeliveryEvidence } from "../../../../../utils/chat/routeLogisticsApi";
import { uploadMedia, mediaApiUrl } from "../../../../../utils/media/mediaClient";
import {
  normalizeCarrierEvidenceForCompare,
} from "../shared/routeLegEvidence";
import type { CarrierEvEditModalState } from "../shared/routesRailSheetModalTypes";

export function carrierEvidenceModalIsDirty(m: CarrierEvEditModalState): boolean {
  const original = m.loaded;
  const a0 = normalizeCarrierEvidenceForCompare(
    original?.text ?? "",
    original?.attachments ?? [],
  );
  const a1 = normalizeCarrierEvidenceForCompare(m.text, m.attachments);
  return a0.text !== a1.text || a0.attsKey !== a1.attsKey;
}

export async function uploadFilesForCarrierEvidenceModal(args: {
  files: File[];
  setModal: (fn: (prev: CarrierEvEditModalState | null) => CarrierEvEditModalState | null) => void;
}): Promise<void> {
  const { files, setModal } = args;
  if (files.length === 0) return;
  setModal((m) => (m ? { ...m, busy: true, uploading: true } : m));
  try {
    const uploaded: ServiceEvidenceAttachmentApi[] = [];
    for (const f of files) {
      const r = await uploadMedia(f);
      const kind = r.mimeType?.startsWith("image/") ? "image" : "document";
      uploaded.push({
        id: crypto.randomUUID(),
        url: mediaApiUrl(r.id),
        fileName: r.fileName,
        kind,
      });
    }
    setModal((m) =>
      m ? { ...m, attachments: [...m.attachments, ...uploaded] } : m,
    );
  } catch (err) {
    toast.error((err as Error)?.message ?? "No se pudo subir el adjunto.");
  } finally {
    setModal((m) => (m ? { ...m, busy: false, uploading: false } : m));
  }
}

export async function saveCarrierEvidenceDraft(args: {
  threadId: string;
  routeSheetId: string;
  agreementId: string;
  m: CarrierEvEditModalState;
  setModal: (fn: (prev: CarrierEvEditModalState | null) => CarrierEvEditModalState | null) => void;
  refreshDeliveriesForAgreement: (id: string) => Promise<void>;
  onClose: () => void;
}): Promise<void> {
  const {
    threadId,
    routeSheetId,
    agreementId,
    m,
    setModal,
    refreshDeliveriesForAgreement,
    onClose,
  } = args;
  const dirty = carrierEvidenceModalIsDirty(m);
  if (!dirty) {
    toast.error("No hay cambios para guardar.");
    return;
  }
  if (agreementId.length < 8) return;
  setModal((x) => (x ? { ...x, busy: true } : x));
  try {
    await upsertCarrierDeliveryEvidence({
      threadId,
      agreementId,
      routeSheetId,
      routeStopId: m.routeStopId,
      text: m.text,
      attachments: m.attachments,
      submit: false,
    });
    toast.success("Evidencia guardada (borrador).");
    await refreshDeliveriesForAgreement(agreementId);
    onClose();
  } catch (e) {
    try {
      const errorMessage = JSON.parse((e as Error).message).message;
      toast.error(errorMessage ?? "No se pudo guardar la evidencia.");
    } catch {
      toast.error("No se pudo guardar la evidencia.");
    }
  } finally {
    setModal((x) => (x ? { ...x, busy: false } : x));
  }
}

export async function submitCarrierEvidenceFromModal(args: {
  threadId: string;
  routeSheetId: string;
  agreementId: string;
  m: CarrierEvEditModalState;
  setModal: (fn: (prev: CarrierEvEditModalState | null) => CarrierEvEditModalState | null) => void;
  refreshDeliveriesForAgreement: (id: string) => Promise<void>;
  onClose: () => void;
}): Promise<void> {
  const {
    threadId,
    routeSheetId,
    agreementId,
    m,
    setModal,
    refreshDeliveriesForAgreement,
    onClose,
  } = args;
  const dirty = carrierEvidenceModalIsDirty(m);
  if (!dirty) {
    toast.error("No hay cambios para enviar.");
    return;
  }
  if (agreementId.length < 8) return;

  const lastSent = m.loaded;
  const lastSentNorm = normalizeCarrierEvidenceForCompare(
    lastSent?.lastSubmittedText ?? "",
    lastSent?.lastSubmittedAttachments ?? [],
  );
  const nowNorm = normalizeCarrierEvidenceForCompare(m.text, m.attachments);
  if (
    lastSentNorm.text === nowNorm.text &&
    lastSentNorm.attsKey === nowNorm.attsKey
  ) {
    toast.error("No hay cambios desde la última evidencia enviada.");
    return;
  }

  setModal((x) => (x ? { ...x, busy: true } : x));
  try {
    await upsertCarrierDeliveryEvidence({
      threadId,
      agreementId,
      routeSheetId,
      routeStopId: m.routeStopId,
      text: m.text,
      attachments: m.attachments,
      submit: true,
    });
    toast.success("Evidencia enviada.");
    await refreshDeliveriesForAgreement(agreementId);
    onClose();
  } catch (e) {
    try {
      const errorMessage = JSON.parse((e as Error).message).message;
      toast.error(errorMessage ?? "No se pudo enviar la evidencia.");
    } catch {
      toast.error("No se pudo enviar la evidencia.");
    }
  } finally {
    setModal((x) => (x ? { ...x, busy: false } : x));
  }
}
