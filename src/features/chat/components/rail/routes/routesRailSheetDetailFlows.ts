import toast from "react-hot-toast";
import type { NavigateFunction } from "react-router-dom";
import { postRouteSheetEditCarrierResponse } from "@features/chat/api/chatApi";
import { getSessionToken } from "@shared/services/http/sessionToken";
import type { RouteOfferPublicState } from "@features/market/model/store/marketStoreTypes";
import type { RouteStopDeliveryStatusApi } from "@features/chat/api/routeLogisticsApi";

export async function railFlowCarrierAcceptAck(args: {
  threadId: string;
  selRouteId: string;
  meId: string;
  onPersistedRouteDataRefresh?: () => Promise<void>;
  respondRouteSheetEdit: (
    threadId: string,
    routeSheetId: string,
    carrierId: string,
    accept: boolean,
  ) => boolean;
}): Promise<void> {
  const {
    threadId,
    selRouteId,
    meId,
    onPersistedRouteDataRefresh,
    respondRouteSheetEdit,
  } = args;

  if (
    threadId.startsWith("cth_") &&
    getSessionToken() &&
    onPersistedRouteDataRefresh
  ) {
    try {
      await postRouteSheetEditCarrierResponse(threadId, selRouteId, true);
      await onPersistedRouteDataRefresh();
      toast.success("Aceptaste la versión actual de la hoja");
    } catch {
      toast.error("No se pudo registrar la aceptación");
    }
    return;
  }
  const ok = respondRouteSheetEdit(threadId, selRouteId, meId, true);
  if (ok) toast.success("Aceptaste la versión actual de la hoja");
  else toast.error("No se pudo registrar la aceptación");
}

export async function railFlowCarrierRejectAck(args: {
  threadId: string;
  selRouteId: string;
  meId: string;
  navigate: NavigateFunction;
  onPersistedRouteDataRefresh?: () => Promise<void>;
  respondRouteSheetEdit: (
    threadId: string,
    routeSheetId: string,
    carrierId: string,
    accept: boolean,
  ) => boolean;
  removeThreadFromList: (
    threadId: string,
    opts?: { skipServerDelete?: boolean },
  ) => Promise<void>;
}): Promise<void> {
  const {
    threadId,
    selRouteId,
    meId,
    navigate,
    onPersistedRouteDataRefresh,
    respondRouteSheetEdit,
    removeThreadFromList,
  } = args;

  const successToast = () =>
    toast.success(
      "Rechazaste la edición: sales del chat del hilo, tus tramos quedan libres en la oferta.",
    );

  if (
    threadId.startsWith("cth_") &&
    getSessionToken() &&
    onPersistedRouteDataRefresh
  ) {
    try {
      await postRouteSheetEditCarrierResponse(threadId, selRouteId, false);
      await onPersistedRouteDataRefresh();
      await removeThreadFromList(threadId, { skipServerDelete: true });
      successToast();
      navigate("/chat");
    } catch {
      toast.error("No se pudo registrar el rechazo");
    }
    return;
  }

  const ok = respondRouteSheetEdit(threadId, selRouteId, meId, false);
  if (!ok) {
    toast.error("No se pudo registrar el rechazo");
    return;
  }
  await removeThreadFromList(threadId, { skipServerDelete: true });
  successToast();
  navigate("/chat");
}

export function confirmedCarrierUidForOfferStop(
  offer: RouteOfferPublicState | undefined,
  sheetId: string,
  stopId: string | undefined,
): string {
  if (
    !stopId?.trim() ||
    (offer?.routeSheetId ?? "").trim() !== sheetId.trim()
  )
    return "";
  const tr = offer?.tramos.find((x) => x.stopId === stopId);
  return tr?.assignment?.status === "confirmed"
    ? (tr.assignment.userId ?? "").trim()
    : "";
}

export function railSheetAnyPaidStopForLiveMap(args: {
  sheetId: string;
  paradas: { id?: string | null }[];
  deliveries: RouteStopDeliveryStatusApi[];
  meHasId: boolean;
  agreementReady: boolean;
}): boolean {
  const { sheetId, paradas, deliveries, meHasId, agreementReady } = args;
  const sid = sheetId.trim();
  if (!agreementReady || !meHasId) return false;

  return paradas.some((stop) => {
    const dr = deliveries.find(
      (d) =>
        (d.routeSheetId ?? "").trim() === sid &&
        (d.routeStopId ?? "").trim() === (stop.id ?? "").trim(),
    );
    const st = (dr?.state ?? "unpaid").trim().toLowerCase();
    return !!dr && st !== "unpaid" && !st.startsWith("refunded");
  });
}
