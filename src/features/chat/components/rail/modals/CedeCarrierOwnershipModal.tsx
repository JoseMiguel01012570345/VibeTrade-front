import type { Dispatch, SetStateAction } from "react";
import { Button, Spinner } from "flowbite-react";
import { getSessionToken } from "@shared/services/http/sessionToken";
import type { CedeOwnershipModalState } from "../shared/routesRailSheetModalTypes";
import { submitCedeCarrierOwnership } from "./cedeCarrierOwnershipModalSubmit";

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
  if (!modal) return null;
  const snap = modal;

  function dismiss(): void {
    setCedeOwnershipModal(null);
  }

  function setBusy(busy: boolean): void {
    setCedeOwnershipModal((x) => (x ? { ...x, busy } : x));
  }

  function confirm(): void {
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

  const isEndOfRoute = snap.nextOrden === 0;

  return (
    <div
      className="fixed inset-0 z-[86] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0 text-[13px] font-black text-[var(--text)]">
            {isEndOfRoute
              ? "Final de la trayectoria"
              : "Ceder titularidad del paquete"}
          </div>
        </div>
        <div className="px-4 py-3 text-[13px] leading-relaxed text-[var(--text)]">
          {!isEndOfRoute ? (
            <>
              <p className="m-0">
                ¿Seguro que querés ceder la titularidad del paquete en el tramo{" "}
                <strong>{snap.currentOrden}</strong> al transportista
                confirmado del tramo <strong>{snap.nextOrden}</strong> (
                <span className="font-semibold">
                  {snap.targetDisplayLabel}
                </span>
                )?
              </p>
              <p className="vt-muted mt-2 mb-0 text-[12px]">
                Solo puedes ceder al transportista habilitado en el siguiente
                tramo. Si el servidor rechaza la operación, verás el motivo
                aquí.
              </p>
            </>
          ) : (
            <p className="vt-muted mt-2 mb-0 text-[12px]">
              ¿Está seguro que decea finalizar el viaje?
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <Button
            color="gray"
            disabled={snap.busy}
            size="sm"
            onClick={dismiss}
          >
            Cancelar
          </Button>
          <Button
            className="[&>span]:gap-2"
            color="blue"
            disabled={snap.busy || !getSessionToken()}
            size="sm"
            onClick={confirm}
          >
            {snap.busy ? (
              <>
                <Spinner aria-hidden className="shrink-0" light size="sm" />
                Procesando…
              </>
            ) : isEndOfRoute ? (
              "Acepto"
            ) : (
              "Sí, ceder"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
