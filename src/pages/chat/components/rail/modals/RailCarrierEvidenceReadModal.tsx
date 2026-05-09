import type { Dispatch, SetStateAction } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "flowbite-react";
import { getSessionToken } from "../../../../../utils/http/sessionToken";
import { carrierDeliveryEvidenceStatusLabelEs } from "../../../../../utils/chat/routeLogisticsLabels";
import type { CarrierEvReadModalState } from "../shared/routesRailSheetModalTypes";
import { CarrierDeliveryEvidenceReadModal } from "./CarrierDeliveryEvidenceReadModal";
import {
  railCarrierEvidenceAccept,
  railCarrierEvidenceReject,
  railCarrierReadModalSellerFooterVisible,
} from "./railCarrierEvidenceReadHandlers";

type Props = {
  modal: CarrierEvReadModalState | null;
  threadId: string;
  routeSheetId: string;
  agreementId: string;
  sellerUid: string;
  viewerUserId: string;
  logisticsBusyKey: string | null;
  setLogisticsBusyKey: Dispatch<SetStateAction<string | null>>;
  setCarrierEvReadModal: Dispatch<
    SetStateAction<CarrierEvReadModalState | null>
  >;
  refreshDeliveriesForAgreement: (agreementId: string) => Promise<void>;
};

/** Lectura de evidencia + pie del vendedor (aceptar / rechazar) cuando aplica. */
export function RailCarrierEvidenceReadModal(props: Props) {
  const {
    modal,
    threadId,
    routeSheetId,
    agreementId,
    sellerUid,
    viewerUserId,
    logisticsBusyKey,
    setLogisticsBusyKey,
    setCarrierEvReadModal,
    refreshDeliveriesForAgreement,
  } = props;

  if (!modal) return null;
  const snap = modal;

  const ev = snap.evidence;
  const attachments =
    ev.lastSubmittedAttachments?.length ?
      ev.lastSubmittedAttachments
    : (ev.attachments ?? []);

  const bodyText =
    ev.lastSubmittedText?.trim() || ev.text?.trim() || "";

  const viewerIsSeller =
    !!viewerUserId &&
    sellerUid.length > 1 &&
    viewerUserId === sellerUid;

  const aidOk = agreementId.trim().length >= 8;
  const showSellerFooter = railCarrierReadModalSellerFooterVisible({
    viewerIsSeller,
    agreementIdLenOk: aidOk,
    evidenceStatus: ev.status ?? "",
  });

  const readBusyBase = `${agreementId.trim()}:${snap.routeStopId}:read`;

  function accept(): void {
    void railCarrierEvidenceAccept({
      threadId,
      routeSheetId,
      agreementId: agreementId.trim(),
      routeStopId: snap.routeStopId,
      readBusyBase,
      setLogisticsBusyKey,
      refreshDeliveriesForAgreement,
      updateReadModal: setCarrierEvReadModal,
      currentModal: snap,
    });
  }

  function reject(): void {
    void railCarrierEvidenceReject({
      threadId,
      routeSheetId,
      agreementId: agreementId.trim(),
      routeStopId: snap.routeStopId,
      readBusyBase,
      setLogisticsBusyKey,
      refreshDeliveriesForAgreement,
      updateReadModal: setCarrierEvReadModal,
      currentModal: snap,
    });
  }

  const footer =
    showSellerFooter ?
      (
        <>
          <Button
            className="[&>span]:gap-2"
            color="blue"
            disabled={
              !getSessionToken() ||
              logisticsBusyKey === `${readBusyBase}:acc`
            }
            size="sm"
            onClick={accept}
          >
            <ThumbsUp className="h-4 w-4 shrink-0" aria-hidden /> Aceptar
            evidencia
          </Button>
          <Button
            className="[&>span]:gap-2"
            color="gray"
            disabled={
              !getSessionToken() ||
              logisticsBusyKey === `${readBusyBase}:rej`
            }
            size="sm"
            onClick={reject}
          >
            <ThumbsDown className="h-4 w-4 shrink-0" aria-hidden /> Rechazar
            evidencia
          </Button>
        </>
      )
    : undefined;

  return (
    <CarrierDeliveryEvidenceReadModal
      attachments={attachments}
      bodyText={bodyText}
      footer={footer}
      open
      statusLabel={
        <>
          <span className="text-gray-500 dark:text-gray-400">Estado: </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {carrierDeliveryEvidenceStatusLabelEs(ev.status)}
          </span>
        </>
      }
      onDismiss={() => setCarrierEvReadModal(null)}
    />
  );
}
