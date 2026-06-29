import type {
  CarrierEvEditModalState,
  CarrierEvReadModalState,
  CedeOwnershipModalState,
  SellerPauseTramoModalState,
  SellerResumeTramoModalState,
} from "./routesRailTypes";

/**
 * Comandos del rail de rutas (panel ↔ detalle ↔ tramos).
 * El panel suscribe el Subject y aplica estado / efectos secundarios.
 */
export type RailRoutesCommand =
  | { type: "logisticsBusyKey"; key: string | null }
  | {
      type: "cedeOwnershipModal";
      modal: CedeOwnershipModalState | null;
    }
  | {
      type: "carrierEvEditModal";
      modal: CarrierEvEditModalState | null;
    }
  | {
      type: "carrierEvReadModal";
      modal: CarrierEvReadModalState | null;
    }
  | {
      type: "sellerPauseTramoModal";
      modal: SellerPauseTramoModalState | null;
    }
  | {
      type: "sellerResumeTramoModal";
      modal: SellerResumeTramoModalState | null;
    }
  | { type: "refreshDeliveries"; agreementId: string }
  | {
      type: "toggleRouteStop";
      routeSheetId: string;
      stopId: string;
    };
