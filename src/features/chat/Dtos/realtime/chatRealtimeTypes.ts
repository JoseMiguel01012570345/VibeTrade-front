import type { RouteTramoSubscriptionItemApi } from "../thread/chatApiTypes";

export type RouteTramoSubscriptionsChangedPayload = {
  threadId: string;
  routeSheetId: string;
  change: string;
  items: RouteTramoSubscriptionItemApi[];
  actorUserId: string;
  /** Publicación emergente <c>emo_*</c>; mismo id que <c>JoinOffer</c> en la ficha. */
  emergentOfferId: string | null;
};

export type CarrierTelemetryUpdatedPayload = {
  threadId: string;
  routeSheetId: string;
  agreementId: string;
  routeStopId: string;
  carrierUserId: string;
  lat: number;
  lng: number;
  progressFraction?: number | null;
  offRoute: boolean;
  reportedAtUtc: string;
  /** km/h según cliente (Geolocation / app). */
  speedKmh?: number | null;
};

export type RouteDeliveriesRefreshPayload = {
  threadId: string;
  routeSheetId: string;
  change: string;
};
