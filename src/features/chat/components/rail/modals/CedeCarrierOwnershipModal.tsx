import type { Dispatch, SetStateAction } from "react";
import { CeButton, CeModal } from "@shared/components/ui";
import { getSessionToken } from "@shared/services/http/sessionToken";
import type { CedeOwnershipModalState } from "@features/chat/Dtos/rail/routesRailTypes";
import { submitCedeCarrierOwnership } from "@features/chat/logic/rail/carrier-evidence/cedeCarrierOwnershipModalSubmit";

type Props = {
  modal: CedeOwnershipModalState | null;
  threadId: string;
  setCedeOwnershipModal: Dispatch<
    SetStateAction<CedeOwnershipModalState | null>
  >;
  setLogisticsBusyKey: Dispatch<SetStateAction<string | null>>;
  refreshDeliveriesForAgreement: (agreementId: string) => Promise<void>;
  onCedeSuccess?: (routeSheetId: string, routeStopId: string) => void;
};

/** Confirmación de cesión de titularidad del paquete entre tramos (overlay). */
export function CedeCarrierOwnershipModal({
  modal,
  threadId,
  setCedeOwnershipModal,
  setLogisticsBusyKey,
  refreshDeliveriesForAgreement,
  onCedeSuccess,
}: Props) {
  const snap = modal;
  const isEndOfRoute = snap?.nextOrden === 0;

  function dismiss(): void {
    setCedeOwnershipModal(null);
  }

  function setBusy(busy: boolean): void {
    setCedeOwnershipModal((x) => (x ? { ...x, busy } : x));
  }

  function confirm(): void {
    if (!snap) return;
    void submitCedeCarrierOwnership({
      threadId,
      modal: snap,
      refreshDeliveriesForAgreement,
      onCedeSuccess,
      setModalBusy: setBusy,
      onSuccessClose: dismiss,
      setLogisticsBusyKey,
      busyKey: `${snap.agreementId}:${snap.routeSheetId}:${snap.routeStopId}:cede`,
    });
  }

  return (
    <CeModal
      show={modal != null}
      onClose={() => !snap?.busy && dismiss()}
      title={
        isEndOfRoute ? "Final de la trayectoria" : "Ceder titularidad del paquete"
      }
      size="md"
      bodyClassName="pt-2"
      footer={
        <>
          <CeButton color="gray" outline disabled={snap?.busy} onClick={dismiss}>
            Cancelar
          </CeButton>
          <CeButton
            color="blue"
            loading={snap?.busy}
            disabled={!getSessionToken()}
            onClick={confirm}
          >
            {isEndOfRoute ? "Acepto" : "Sí, ceder"}
          </CeButton>
        </>
      }
    >
      {!isEndOfRoute ? (
        <>
          <p className="m-0 text-sm leading-relaxed text-gray-900 dark:text-gray-100">
            ¿Seguro que querés ceder la titularidad del paquete en el tramo{" "}
            <strong>{snap?.currentOrden}</strong> al transportista confirmado del
            tramo <strong>{snap?.nextOrden}</strong> (
            <span className="font-semibold">{snap?.targetDisplayLabel}</span>
            )?
          </p>
          <p className="mt-2 mb-0 text-xs text-gray-600 dark:text-gray-400">
            Solo puedes ceder al transportista habilitado en el siguiente tramo.
            Si el servidor rechaza la operación, verás el motivo aquí.
          </p>
        </>
      ) : (
        <p className="mt-2 mb-0 text-xs text-gray-600 dark:text-gray-400">
          ¿Está seguro que decea finalizar el viaje?
        </p>
      )}
    </CeModal>
  );
}
