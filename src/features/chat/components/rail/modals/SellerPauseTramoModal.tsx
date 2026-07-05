import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { CeButton, CeModal } from "@shared/components/ui";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { postSellerPauseTramoForStoreCustody } from "@features/chat/api/routeLogisticsApi";
import type { SellerPauseTramoModalState } from "@features/chat/Dtos/rail/routesRailTypes";

type Props = {
  modal: SellerPauseTramoModalState | null;
  threadId: string;
  setSellerPauseTramoModal: Dispatch<
    SetStateAction<SellerPauseTramoModalState | null>
  >;
  setLogisticsBusyKey: Dispatch<SetStateAction<string | null>>;
  refreshDeliveriesForAgreement: (agreementId: string) => Promise<void>;
};

/** Pausa operativa del tramo (custodia tienda / IDLE); motivo obligatorio. */
export function SellerPauseTramoModal({
  modal,
  threadId,
  setSellerPauseTramoModal,
  setLogisticsBusyKey,
  refreshDeliveriesForAgreement,
}: Props) {
  const snap = modal;

  function dismiss(): void {
    setSellerPauseTramoModal(null);
  }

  function setBusy(busy: boolean): void {
    setSellerPauseTramoModal((x) => (x ? { ...x, busy } : x));
  }

  function setReason(reason: string): void {
    setSellerPauseTramoModal((x) => (x ? { ...x, reason } : x));
  }

  async function confirm(): Promise<void> {
    if (!snap) return;
    const reason = snap.reason.trim();
    if (reason.length < 1) {
      toast.error("Indicá el motivo de la pausa.");
      return;
    }
    const busyKey = `${snap.agreementId}:${snap.routeSheetId}:${snap.routeStopId}:seller-pause`;
    setBusy(true);
    setLogisticsBusyKey(busyKey);
    try {
      await postSellerPauseTramoForStoreCustody({
        threadId,
        agreementId: snap.agreementId,
        routeSheetId: snap.routeSheetId,
        routeStopId: snap.routeStopId,
        reason,
      });
      toast.success("Tramo en pausa (custodia tienda).");
      await refreshDeliveriesForAgreement(snap.agreementId);
      dismiss();
    } catch (e) {
      toast.error((e as Error)?.message ?? "No se pudo pausar el tramo.");
      setBusy(false);
    } finally {
      setLogisticsBusyKey(null);
    }
  }

  return (
    <CeModal
      show={modal != null}
      onClose={() => !snap?.busy && dismiss()}
      title="Pausar tramo (custodia tienda)"
      size="md"
      bodyClassName="pt-2"
      footer={
        <>
          <CeButton color="gray" outline disabled={snap?.busy} onClick={dismiss}>
            Cancelar
          </CeButton>
          <CeButton
            color="warning"
            loading={snap?.busy}
            disabled={!getSessionToken()}
            onClick={() => void confirm()}
          >
            Confirmar pausa
          </CeButton>
        </>
      }
    >
      <p className="m-0 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
        El transportista deja de ser titular en este tramo y podrá retirarse del
        hilo cuando la logística lo permita. Solo puede haber un tramo en pausa
        por hoja.
      </p>
      <label className="mt-3 block text-xs font-semibold text-gray-900 dark:text-gray-100">
        Motivo (obligatorio)
        <textarea
          className="mt-1 w-full min-h-[88px] resize-y rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-amber-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          maxLength={2000}
          value={snap?.reason ?? ""}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
    </CeModal>
  );
}
