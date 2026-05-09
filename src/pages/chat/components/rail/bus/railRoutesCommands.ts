import type {
  CarrierEvEditModalState,
  CarrierEvReadModalState,
  CedeOwnershipModalState,
} from "../shared/routesRailSheetModalTypes";

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
  | { type: "refreshDeliveries"; agreementId: string }
  | {
      type: "toggleRouteStop";
      routeSheetId: string;
      stopId: string;
    };
