import type {
  RouteOfferPublicState,
  RouteSheetEditAckState,
} from "@app/store/marketStoreTypes";
import type { TradeAgreement } from "@features/market/model/tradeAgreementTypes";
import type { RouteSheet } from "@features/market/model/routeSheetTypes";
import type { RouteStopDeliveryStatusApi } from "@/utils/chat/routeLogisticsApi";

export type RoutesRailSheetDetailProps = {
  selRoute: RouteSheet;
  setSelRouteId: (id: string | null) => void;
  threadId: string;
  isActingSeller: boolean;
  sheetLockedByPaid: boolean;
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
  cedeOwnershipByAgreement:
    | Record<string, Record<string, boolean>>
    | undefined;
  /** Solo lectura para UI de logística (botones deshabilitados mientras hay operación). */
  logisticsBusyKey: string | null;
  onOpenLiveMapAllStops: () => void;
  /** Bloquea acciones de edición de hoja hasta que exista pago registrado. */
  actionsLocked: boolean;
};
