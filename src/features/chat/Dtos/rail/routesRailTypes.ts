import type {
  RouteOfferPublicState,
  RouteOfferTramoPublic,
  RouteSheetEditAckState,
} from "@features/market/logic/store/marketStoreTypes";
import type { TradeAgreement } from "../agreement/tradeAgreementTypes";
import type { RouteSheet, RouteStop } from "../route-sheet/routeSheetTypes";
import type { RouteTramoSubscriptionItemApi } from "../thread/chatApiTypes";
import type { RouteStopDeliveryStatusApi } from "../route-sheet/routeLogisticsApiTypes";
import type { ServiceEvidenceAttachmentApi } from "../agreement/agreementServiceEvidenceApiTypes";
import type { CarrierDeliveryEvidenceApi } from "../route-sheet/routeLogisticsApiTypes";
import type { RailRoutesCommand } from "./railRoutesCommandTypes";

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

export type RoutesRailSheetDetailProps = {
  selRoute: RouteSheet;
  setSelRouteId: (id: string | null) => void;
  threadId: string;
  isActingSeller: boolean;
  sheetLockedByPaid: boolean;
  sheetStructuralEditBlockedByPaid: boolean;
  sheetEditBlockedByCarrierAck: boolean;
  linkedRouteSheetIds: ReadonlySet<string>;
  routeOfferResolved: RouteOfferPublicState | undefined;
  routeSheetEditAcks: Record<string, RouteSheetEditAckState> | undefined;
  myCarrierAck: "pending" | "accepted" | "rejected" | undefined;
  meId: string;
  sellerUid: string;
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
  onPersistedRouteDataRefresh?: () => Promise<void>;
  onEditRouteSheet: (sheet: RouteSheet) => void;
  onInviteTransportista: () => void;
  deleteRouteSheet: (threadId: string, routeSheetId: string) => boolean;
  duplicateRouteSheet: (
    threadId: string,
    routeSheetId: string,
  ) => Promise<string | null>;
  publishRouteSheetsToPlatform: (
    threadId: string,
    routeSheetIds: string[],
  ) => void;
  unpublishRouteSheetFromPlatform: (
    threadId: string,
    routeSheetId: string,
  ) => void;
  getAgreementForSheet: (routeSheetId: string) => TradeAgreement | null;
  deliveriesByAgreement: Record<string, RouteStopDeliveryStatusApi[]>;
  /** Suscripciones del hilo (GET autoritativo) para candidatos de reanudar tramo. */
  routeTramoSubscriptions?: RouteTramoSubscriptionItemApi[];
  cedeOwnershipByAgreement:
    | Record<string, Record<string, boolean>>
    | undefined;
  /** Solo lectura para UI de logística (botones deshabilitados mientras hay operación). */
  logisticsBusyKey: string | null;
  onOpenLiveMapAllStops: () => void;
  /** Bloquea acciones de edición de hoja hasta que exista pago registrado. */
  actionsLocked: boolean;
};

export type RailLegResumeCandidate = {
  userId: string;
  displayName: string;
};

export type RailLegModel = {
  agreement: TradeAgreement | null;
  agreementId: string;
  deliveries: RouteStopDeliveryStatusApi[];
  row: RouteStopDeliveryStatusApi | undefined;
  logisticsState: string;
  ot: RouteOfferTramoPublic | undefined;
  nextParada: RouteStop | undefined;
  nextOt: RouteOfferTramoPublic | undefined;
  busyKeyBase: string;
  activeLike: boolean;
  showEvidenceBtn: boolean;
  showCedeOwnership: boolean;
  viewerIsConfirmedOnThisStop: boolean;
  viewerIsSeller: boolean;
  viewerIsOwnerCarrierStrict: boolean;
  /** Transportistas confirmados en este `routeStopId` (para reanudar desde IDLE). */
  resumeCandidateCarriers: RailLegResumeCandidate[];
  showSellerPauseTramo: boolean;
  showSellerResumeTramo: boolean;
};

export type RailLegHandlerCtxBase = {
  threadId: string;
  selRoute: RouteSheet;
  p: RouteStop;
  m: RailLegModel;
  dispatch: (cmd: RailRoutesCommand) => void;
};
