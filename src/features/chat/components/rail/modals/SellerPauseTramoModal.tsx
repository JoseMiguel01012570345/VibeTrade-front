import type { Dispatch, SetStateAction } from "react";
import { Button, Spinner } from "flowbite-react";
import toast from "react-hot-toast";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { postSellerPauseTramoForStoreCustody } from "@features/chat/api/routeLogisticsApi";
import type { SellerPauseTramoModalState } from "../shared/routesRailSheetModalTypes";

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
  if (!modal) return null;
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
    <div
      className="fixed inset-0 z-[86] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0 text-[13px] font-black text-[var(--text)]">
            Pausar tramo (custodia tienda)
          </div>
        </div>
        <div className="px-4 py-3 text-[13px] leading-relaxed text-[var(--text)]">
          <p className="m-0 vt-muted text-[12px]">
            El transportista deja de ser titular en este tramo y podrá retirarse
            del hilo cuando la logística lo permita. Solo puede haber un tramo
            en pausa por hoja.
          </p>
          <label className="mt-3 block text-[12px] font-semibold text-[var(--text)]">
            Motivo (obligatorio)
            <textarea
              className="mt-1 w-full min-h-[88px] resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[13px] text-[var(--text)] outline-none focus:ring-2 focus:ring-amber-500/40"
              maxLength={2000}
              value={snap.reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <Button color="gray" disabled={snap.busy} size="sm" onClick={dismiss}>
            Cancelar
          </Button>
          <Button
            className="[&>span]:gap-2"
            color="warning"
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
              "Confirmar pausa"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
