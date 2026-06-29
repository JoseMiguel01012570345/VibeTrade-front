import toast from "react-hot-toast";
import { postCedeCarrierOwnership } from "@features/chat/api/routeLogisticsApi";
import type { CedeOwnershipModalState } from "@features/chat/Dtos/rail/routesRailTypes";

export async function submitCedeCarrierOwnership(args: {
  threadId: string;
  modal: CedeOwnershipModalState;
  refreshDeliveriesForAgreement: (agreementId: string) => Promise<void>;
  onCedeSuccess?: (routeSheetId: string, routeStopId: string) => void;
  setModalBusy: (busy: boolean) => void;
  onSuccessClose: () => void;
  setLogisticsBusyKey: (key: string | null) => void;
  busyKey: string;
}): Promise<void> {
  const {
    threadId,
    modal: m,
    refreshDeliveriesForAgreement,
    onCedeSuccess,
    setModalBusy,
    onSuccessClose,
    setLogisticsBusyKey,
    busyKey,
  } = args;

  setModalBusy(true);
  setLogisticsBusyKey(busyKey);
  try {
    const r = await postCedeCarrierOwnership({
      threadId,
      agreementId: m.agreementId,
      routeSheetId: m.routeSheetId,
      routeStopId: m.routeStopId,
    });
    if (!r.ok) {
      toast.error(
        (r.message ?? "").trim() ||
          "El servidor rechazó la cesión de titularidad.",
      );
      setModalBusy(false);
      return;
    }
    onCedeSuccess?.(m.routeSheetId, m.routeStopId);
    if (r.errorCode === "end_of_route") {
      toast.success("Trayectoria finalizada.");
      await refreshDeliveriesForAgreement(m.agreementId);
      onSuccessClose();
      return;
    }
    toast.success(
      "Titularidad cedida. El otro transportista fue notificado.",
    );
    await refreshDeliveriesForAgreement(m.agreementId);
    onSuccessClose();
  } catch (e) {
    toast.error(
      (e as Error)?.message ?? "No se pudo ceder la titularidad.",
    );
    setModalBusy(false);
  } finally {
    setLogisticsBusyKey(null);
  }
}
