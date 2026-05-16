import type { CarrierDeliveryEvidenceApi } from "../../../../../utils/chat/routeLogisticsApi";
import type { ServiceEvidenceAttachmentApi } from "../../../../../utils/chat/agreementServiceEvidenceApi";

export type CedeOwnershipModalState = {
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
  busy: boolean;
  targetDisplayLabel: string;
  currentOrden: number;
  nextOrden: number;
};

export type CarrierEvEditModalState = {
  routeStopId: string;
  busy: boolean;
  uploading: boolean;
  text: string;
  attachments: ServiceEvidenceAttachmentApi[];
  loaded: CarrierDeliveryEvidenceApi | null;
};

export type CarrierEvReadModalState = {
  routeStopId: string;
  evidence: CarrierDeliveryEvidenceApi;
};

export type SellerPauseTramoModalState = {
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
  reason: string;
  busy: boolean;
};

export type SellerResumeTramoModalState = {
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
  busy: boolean;
  candidates: { userId: string; displayName: string }[];
  selectedCarrierUserId: string;
};
