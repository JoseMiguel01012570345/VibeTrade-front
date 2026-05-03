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

/** Última telemetría persistida por tramo (titular actual), para inicializar el mapa. */
export async function fetchLatestCarrierTelemetryForRouteSheet(args: {
  threadId: string;
  agreementId: string;
  routeSheetId: string;
}): Promise<CarrierTelemetryLatestPointApi[]> {
  const qs = new URLSearchParams({ routeSheetId: args.routeSheetId });
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/telemetry/latest?${qs.toString()}`,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as CarrierTelemetryLatestPointApi[];
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

export type CarrierOwnershipCedeResultApi = {
  ok: boolean;
  errorCode?: string | null;
  message?: string | null;
};

function parseCedeOwnershipErrorBody(raw: string): string | undefined {
  const t = raw.trim();
  if (!t.startsWith("{")) return undefined;
  try {
    const j = JSON.parse(t) as CarrierOwnershipCedeResultApi;
    const msg = typeof j.message === "string" ? j.message.trim() : "";
    return msg.length > 0 ? msg : undefined;
  } catch {
    return undefined;
  }
}

export async function postCedeCarrierOwnership(args: {
  threadId: string;
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
  targetCarrierUserId: string;
}): Promise<CarrierOwnershipCedeResultApi> {
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
  const raw = await res.text().catch(() => "");
  if (!res.ok) {
    const fromJson = parseCedeOwnershipErrorBody(raw);
    throw new Error(fromJson ?? (raw.trim() || `HTTP ${res.status}`));
  }
  try {
    return JSON.parse(raw) as CarrierOwnershipCedeResultApi;
  } catch {
    return { ok: true, errorCode: null, message: null };
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
