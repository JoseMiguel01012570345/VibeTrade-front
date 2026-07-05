import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { CeButton, CeModal } from "@shared/components/ui";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { postSellerResumeTramoFromIdle } from "@features/chat/api/routeLogisticsApi";
import type { SellerResumeTramoModalState } from "@features/chat/Dtos/rail/routesRailTypes";

type Props = {
  modal: SellerResumeTramoModalState | null;
  threadId: string;
  setSellerResumeTramoModal: Dispatch<
    SetStateAction<SellerResumeTramoModalState | null>
  >;
  setLogisticsBusyKey: Dispatch<SetStateAction<string | null>>;
  refreshDeliveriesForAgreement: (agreementId: string) => Promise<void>;
};

/** Reanudar tramo en IDLE: titular = transportista ya confirmado en ese tramo. */
export function SellerResumeTramoModal({
  modal,
  threadId,
  setSellerResumeTramoModal,
  setLogisticsBusyKey,
  refreshDeliveriesForAgreement,
}: Props) {
  const snap = modal;

  function dismiss(): void {
    setSellerResumeTramoModal(null);
  }

  function setBusy(busy: boolean): void {
    setSellerResumeTramoModal((x) => (x ? { ...x, busy } : x));
  }

  function setSelectedCarrierUserId(selectedCarrierUserId: string): void {
    setSellerResumeTramoModal((x) => (x ? { ...x, selectedCarrierUserId } : x));
  }

  async function confirm(): Promise<void> {
    if (!snap) return;
    const uid = snap.selectedCarrierUserId.trim();
    if (uid.length < 2) {
      toast.error("Elegí un transportista confirmado.");
      return;
    }
    const busyKey = `${snap.agreementId}:${snap.routeSheetId}:${snap.routeStopId}:seller-resume`;
    setBusy(true);
    setLogisticsBusyKey(busyKey);
    try {
      await postSellerResumeTramoFromIdle({
        threadId,
        agreementId: snap.agreementId,
        routeSheetId: snap.routeSheetId,
        routeStopId: snap.routeStopId,
        targetCarrierUserId: uid,
      });
      toast.success("Tramo reanudado: titularidad en tránsito.");
      await refreshDeliveriesForAgreement(snap.agreementId);
      dismiss();
    } catch (e) {
      toast.error((e as Error)?.message ?? "No se pudo reanudar el tramo.");
      setBusy(false);
    } finally {
      setLogisticsBusyKey(null);
    }
  }

  return (
    <CeModal
      show={modal != null}
      onClose={() => !snap?.busy && dismiss()}
      title="Reanudar tramo"
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
            onClick={() => void confirm()}
          >
            Reanudar
          </CeButton>
        </>
      }
    >
      <p className="m-0 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
        Asigná de nuevo la titularidad a un transportista que siga confirmado en
        este tramo (puede ser el mismo u otro).
      </p>
      <label className="mt-3 block text-xs font-semibold text-gray-900 dark:text-gray-100">
        Transportista
        <select
          className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          value={snap?.selectedCarrierUserId ?? ""}
          onChange={(e) => setSelectedCarrierUserId(e.target.value)}
        >
          {snap?.candidates.map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.displayName}
            </option>
          ))}
        </select>
      </label>
    </CeModal>
  );
}
