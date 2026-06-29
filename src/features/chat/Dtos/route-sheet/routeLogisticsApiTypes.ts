import type { ServiceEvidenceAttachmentApi } from "../agreement/agreementServiceEvidenceApiTypes";

export type RouteStopDeliveryStatusApi = {
  routeSheetId: string;
  routeStopId: string;
  state: string;
  currentOwnerUserId?: string | null;
  lastTelemetryProgressFraction?: number | null;
  proximityNotifiedAtUtc?: string | null;
};

export type CarrierTelemetryLatestPointApi = {
  routeSheetId: string;
  routeStopId: string;
  carrierUserId: string;
  lat: number;
  lng: number;
  progressFraction?: number | null;
  offRoute: boolean;
  reportedAtUtc: string;
  speedKmh?: number | null;
};

export type CarrierOwnershipCedeResultApi = {
  ok: boolean;
  errorCode?: string | null;
  message?: string | null;
};

export type CarrierDeliveryEvidenceApi = {
  id: string;
  carrierUserId: string;
  text: string;
  attachments: ServiceEvidenceAttachmentApi[];
  lastSubmittedText: string;
  lastSubmittedAttachments: ServiceEvidenceAttachmentApi[];
  lastSubmittedAtUtc?: string | null;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  decidedAtUtc?: string | null;
  decidedByUserId?: string | null;
  deadlineAtUtc?: string | null;
};
