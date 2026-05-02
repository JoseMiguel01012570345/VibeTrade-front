import { apiFetch } from "../http/apiClient";
import type { ServiceEvidenceAttachmentApi } from "./agreementServiceEvidenceApi";

export type RouteStopDeliveryStatusApi = {
  routeSheetId: string;
  routeStopId: string;
  state: string;
  currentOwnerUserId?: string | null;
  lastTelemetryProgressFraction?: number | null;
  proximityNotifiedAtUtc?: string | null;
};

export async function fetchAgreementRouteDeliveries(
  threadId: string,
  agreementId: string,
): Promise<RouteStopDeliveryStatusApi[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/agreements/${encodeURIComponent(agreementId)}/logistics/deliveries`,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as RouteStopDeliveryStatusApi[];
}

export async function postCarrierTelemetry(args: {
  threadId: string;
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
  lat: number;
  lng: number;
  speedKmh?: number | null;
  reportedAtUtc: string;
  sourceClientId: string;
}): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/telemetry`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeSheetId: args.routeSheetId,
        routeStopId: args.routeStopId,
        lat: args.lat,
        lng: args.lng,
        speedKmh: args.speedKmh ?? null,
        reportedAtUtc: args.reportedAtUtc,
        sourceClientId: args.sourceClientId,
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
}

export async function postCedeCarrierOwnership(args: {
  threadId: string;
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
  targetCarrierUserId: string;
}): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/ownership/cede`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeSheetId: args.routeSheetId,
        routeStopId: args.routeStopId,
        targetCarrierUserId: args.targetCarrierUserId,
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
}

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

export async function fetchCarrierDeliveryEvidence(args: {
  threadId: string;
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
}): Promise<CarrierDeliveryEvidenceApi | null> {
  const qs = new URLSearchParams({
    routeSheetId: args.routeSheetId,
    routeStopId: args.routeStopId,
  });
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/evidence?${qs.toString()}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as CarrierDeliveryEvidenceApi;
}

export async function upsertCarrierDeliveryEvidence(args: {
  threadId: string;
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
  text: string;
  attachments: ServiceEvidenceAttachmentApi[];
  submit: boolean;
}): Promise<CarrierDeliveryEvidenceApi> {
  const qs = new URLSearchParams({
    routeSheetId: args.routeSheetId,
    routeStopId: args.routeStopId,
  });
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/evidence?${qs.toString()}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: args.text,
        attachments: args.attachments,
        submit: args.submit,
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as CarrierDeliveryEvidenceApi;
}

export async function decideCarrierDeliveryEvidence(args: {
  threadId: string;
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
  decision: "accept" | "reject";
}): Promise<void> {
  const qs = new URLSearchParams({
    routeSheetId: args.routeSheetId,
    routeStopId: args.routeStopId,
  });
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/evidence/decide?${qs.toString()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: args.decision }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
}

export async function requestEligibleLegRefund(args: {
  threadId: string;
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
}): Promise<void> {
  const qs = new URLSearchParams({
    routeSheetId: args.routeSheetId,
    routeStopId: args.routeStopId,
  });
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/refunds/leg?${qs.toString()}`,
    { method: "POST" },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
}
