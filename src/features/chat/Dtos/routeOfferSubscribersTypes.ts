import type { RouteOfferTramoAssignment } from "@features/market/Dtos/marketTypes";

export type RouteOfferSubscriberTramo = {
  routeSheetId: string;
  stopId: string;
  orden: number;
  status: RouteOfferTramoAssignment["status"];
  origenLine: string;
  destinoLine: string;
};

export type RouteOfferSubscriberSummary = {
  userId: string;
  displayName: string;
  phone: string;
  trustScore: number;
  /** Etiqueta del servicio de transporte elegido al suscribirse (en store se guarda como `vehicleLabel`). */
  transportServiceLabel?: string;
  storeServiceId?: string;
  /** Tienda del servicio (enlace a vitrina / servicios). */
  carrierServiceStoreId?: string;
  tramos: RouteOfferSubscriberTramo[];
};

export type RouteSheetMetaEntry = { id: string; titulo: string };

/** Tramo de la hoja con los transportistas que tienen suscripción en ese tramo. */
export type RouteOfferTramoSubscriberGroup = {
  routeSheetId: string;
  stopId: string;
  orden: number;
  origenLine: string;
  destinoLine: string;
  carriers: RouteOfferSubscriberSummary[];
};

export type RouteSheetSubscriberSection = {
  routeSheetId: string;
  titulo: string;
  tramoGroups: RouteOfferTramoSubscriberGroup[];
};
