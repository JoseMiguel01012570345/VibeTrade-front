import toast from "react-hot-toast";
import {
  decideCarrierDeliveryEvidence,
  fetchCarrierDeliveryEvidence,
} from "@features/chat/api/routeLogisticsApi";
import type { CarrierDeliveryEvidenceApi } from "@features/chat/api/routeLogisticsApi";
import type { CarrierEvReadModalState } from "../shared/routesRailSheetModalTypes";

export async function railCarrierEvidenceAccept(args: {
  threadId: string;
  routeSheetId: string;
  agreementId: string;
  routeStopId: string;
  readBusyBase: string;
  setLogisticsBusyKey: (key: string | null) => void;
  refreshDeliveriesForAgreement: (id: string) => Promise<void>;
  updateReadModal: (
    next: CarrierEvReadModalState | null,
  ) => void;
  currentModal: CarrierEvReadModalState;
}): Promise<void> {
  const {
    threadId,
    routeSheetId,
    agreementId,
    routeStopId,
    readBusyBase,
    setLogisticsBusyKey,
    refreshDeliveriesForAgreement,
    updateReadModal,
    currentModal,
  } = args;

  try {
    setLogisticsBusyKey(`${readBusyBase}:acc`);
    await decideCarrierDeliveryEvidence({
      threadId,
      agreementId,
      routeSheetId,
      routeStopId,
      decision: "accept",
    });
    toast.success("Evidencia aceptada.");
    await refreshDeliveriesForAgreement(agreementId);
    const ev = await fetchCarrierDeliveryEvidence({
      threadId,
      agreementId,
      routeSheetId,
      routeStopId,
    });
    mergeFetchedEvidenceIntoReadModal(ev, currentModal, updateReadModal);
  } catch (e) {
    toast.error((e as Error)?.message ?? "No se pudo aceptar.");
  } finally {
    setLogisticsBusyKey(null);
  }
}

export async function railCarrierEvidenceReject(args: {
  threadId: string;
  routeSheetId: string;
  agreementId: string;
  routeStopId: string;
  readBusyBase: string;
  setLogisticsBusyKey: (key: string | null) => void;
  refreshDeliveriesForAgreement: (id: string) => Promise<void>;
  updateReadModal: (next: CarrierEvReadModalState | null) => void;
  currentModal: CarrierEvReadModalState;
}): Promise<void> {
  const {
    threadId,
    routeSheetId,
    agreementId,
    routeStopId,
    readBusyBase,
    setLogisticsBusyKey,
    refreshDeliveriesForAgreement,
    updateReadModal,
    currentModal,
  } = args;

  try {
    setLogisticsBusyKey(`${readBusyBase}:rej`);
    await decideCarrierDeliveryEvidence({
      threadId,
      agreementId,
      routeSheetId,
      routeStopId,
      decision: "reject",
    });
    toast.success("Evidencia rechazada.");
    await refreshDeliveriesForAgreement(agreementId);
    const ev = await fetchCarrierDeliveryEvidence({
      threadId,
      agreementId,
      routeSheetId,
      routeStopId,
    });
    mergeFetchedEvidenceIntoReadModal(ev, currentModal, updateReadModal);
  } catch (e) {
    toast.error((e as Error)?.message ?? "No se pudo rechazar.");
  } finally {
    setLogisticsBusyKey(null);
  }
}

function mergeFetchedEvidenceIntoReadModal(
  ev: CarrierDeliveryEvidenceApi | null,
  currentModal: CarrierEvReadModalState,
  updateReadModal: (next: CarrierEvReadModalState | null) => void,
): void {
  if (ev) {
    updateReadModal({
      routeStopId: currentModal.routeStopId,
      evidence: ev,
    });
  } else {
    updateReadModal(null);
  }
}

export function railCarrierReadModalSellerFooterVisible(args: {
  viewerIsSeller: boolean;
  agreementIdLenOk: boolean;
  evidenceStatus: string;
}): boolean {
  const evSt = args.evidenceStatus.trim().toLowerCase();
  return (
    args.viewerIsSeller &&
    args.agreementIdLenOk &&
    (evSt === "submitted" || evSt === "rejected")
  );
}
