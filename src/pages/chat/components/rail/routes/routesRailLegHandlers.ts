import toast from "react-hot-toast";
import {
  decideCarrierDeliveryEvidence,
  fetchCarrierDeliveryEvidence,
} from "../../../../../utils/chat/routeLogisticsApi";
import type { RouteStop } from "../../../domain/routeSheetTypes";
import type { RouteSheet } from "../../../domain/routeSheetTypes";
import type { RailRoutesCommand } from "../bus/railRoutesCommands";
import type { RailLegModel } from "./routesRailLegModel";

export type RailLegHandlerCtxBase = {
  threadId: string;
  selRoute: RouteSheet;
  p: RouteStop;
  m: RailLegModel;
  dispatch: (cmd: RailRoutesCommand) => void;
};

export async function railLegLoadCarrierEvidenceEditor(
  ctx: RailLegHandlerCtxBase,
): Promise<void> {
  const { threadId, selRoute, p, m, dispatch } = ctx;
  let loaded = null as Awaited<
    ReturnType<typeof fetchCarrierDeliveryEvidence>
  > | null;
  try {
    loaded = await fetchCarrierDeliveryEvidence({
      threadId,
      agreementId: m.agreementId,
      routeSheetId: selRoute.id,
      routeStopId: p.id,
    });
  } catch {
    /* sin fila previa */
  }
  dispatch({
    type: "carrierEvEditModal",
    modal: {
      routeStopId: p.id,
      busy: false,
      uploading: false,
      text: loaded?.text ?? "",
      attachments: loaded?.attachments ?? [],
      loaded,
    },
  });
}

export async function railLegOpenSellerEvidenceRead(
  ctx: RailLegHandlerCtxBase,
): Promise<void> {
  const { threadId, selRoute, p, m, dispatch } = ctx;
  try {
    const ev = await fetchCarrierDeliveryEvidence({
      threadId,
      agreementId: m.agreementId,
      routeSheetId: selRoute.id,
      routeStopId: p.id,
    });
    if (!ev) {
      toast.error("Aún no hay evidencia registrada.");
      return;
    }
    dispatch({
      type: "carrierEvReadModal",
      modal: { routeStopId: p.id, evidence: ev },
    });
  } catch {
    toast.error("No se pudo cargar la evidencia.");
  }
}

export async function railLegSellerDecideEvidence(
  ctx: RailLegHandlerCtxBase,
  decision: "accept" | "reject",
): Promise<void> {
  const { threadId, selRoute, p, m, dispatch } = ctx;
  const suffix = decision === "accept" ? ":acc" : ":rej";
  const busyFull = `${m.busyKeyBase}${suffix}`;
  try {
    dispatch({ type: "logisticsBusyKey", key: busyFull });
    await decideCarrierDeliveryEvidence({
      threadId,
      agreementId: m.agreementId,
      routeSheetId: selRoute.id,
      routeStopId: p.id,
      decision,
    });
    toast.success(
      decision === "accept"
        ? "Evidencia aceptada."
        : "Evidencia rechazada.",
    );
    dispatch({
      type: "refreshDeliveries",
      agreementId: m.agreementId,
    });
  } catch (e) {
    if (decision === "accept") {
      try {
        const raw = JSON.parse((e as Error).message).message;
        toast.error(raw ?? "No se pudo aceptar.");
      } catch {
        toast.error("No se pudo aceptar.");
      }
    } else {
      toast.error((e as Error)?.message ?? "No se pudo rechazar.");
    }
  } finally {
    dispatch({ type: "logisticsBusyKey", key: null });
  }
}

export function railLegOpenSellerPauseTramoModal(ctx: RailLegHandlerCtxBase): void {
  const { selRoute, p, m, dispatch } = ctx;
  dispatch({
    type: "sellerPauseTramoModal",
    modal: {
      agreementId: m.agreementId,
      routeSheetId: selRoute.id,
      routeStopId: p.id,
      reason: "",
      busy: false,
    },
  });
}

export function railLegOpenSellerResumeTramoModal(ctx: RailLegHandlerCtxBase): void {
  const { selRoute, p, m, dispatch } = ctx;
  const candidates = m.resumeCandidateCarriers;
  if (candidates.length === 0) return;
  dispatch({
    type: "sellerResumeTramoModal",
    modal: {
      agreementId: m.agreementId,
      routeSheetId: selRoute.id,
      routeStopId: p.id,
      busy: false,
      candidates,
      selectedCarrierUserId: candidates[0]!.userId,
    },
  });
}

export function railLegOpenCedeOwnershipModal(ctx: RailLegHandlerCtxBase): void {
  const { selRoute, p, m, dispatch } = ctx;
  dispatch({
    type: "cedeOwnershipModal",
    modal: {
      agreementId: m.agreementId,
      routeSheetId: selRoute.id,
      routeStopId: p.id,
      busy: false,
      targetDisplayLabel:
        m.nextOt?.assignment?.displayName?.trim() ||
        "Transportista confirmado del siguiente tramo",
      currentOrden: p.orden ?? 0,
      nextOrden: m.nextParada?.orden ?? 0,
    },
  });
}
