import type { Dispatch, SetStateAction } from "react";
import { Button, Spinner } from "flowbite-react";
import toast from "react-hot-toast";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { postSellerResumeTramoFromIdle } from "@features/chat/api/routeLogisticsApi";
import type { SellerResumeTramoModalState } from "../shared/routesRailSheetModalTypes";

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
  if (!modal) return null;
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
    <div
      className="fixed inset-0 z-[86] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0 text-[13px] font-black text-[var(--text)]">
            Reanudar tramo
          </div>
        </div>
        <div className="px-4 py-3 text-[13px] leading-relaxed text-[var(--text)]">
          <p className="m-0 vt-muted text-[12px]">
            Asigná de nuevo la titularidad a un transportista que siga confirmado
            en este tramo (puede ser el mismo u otro).
          </p>
          <label className="mt-3 block text-[12px] font-semibold text-[var(--text)]">
            Transportista
            <select
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[13px] text-[var(--text)] outline-none focus:ring-2 focus:ring-sky-500/40"
              value={snap.selectedCarrierUserId}
              onChange={(e) => setSelectedCarrierUserId(e.target.value)}
            >
              {snap.candidates.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <Button color="gray" disabled={snap.busy} size="sm" onClick={dismiss}>
            Cancelar
          </Button>
          <Button
            className="[&>span]:gap-2"
            color="blue"
            disabled={snap.busy || !getSessionToken()}
            size="sm"
            onClick={() => void confirm()}
          >
            {snap.busy ? (
              <>
                <Spinner aria-hidden className="shrink-0" light size="sm" />
                Procesando…
              </>
            ) : (
              "Reanudar"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
