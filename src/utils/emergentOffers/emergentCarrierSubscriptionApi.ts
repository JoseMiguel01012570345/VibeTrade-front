import { apiFetch } from "../http/apiClient";

export type EmergentCarrierSubscriptionResponse = {
  canSubscribe: boolean;
  reasonCode?: string | null;
  message?: string | null;
};

/** GET: reglas de negocio en servidor (comprador con acuerdo aceptado en el hilo vinculado). */
export async function fetchEmergentCarrierSubscriptionStatus(
  emergentOfferId: string,
): Promise<EmergentCarrierSubscriptionResponse | null> {
  const res = await apiFetch(
    `/api/v1/emergent-offers/${encodeURIComponent(emergentOfferId)}/carrier-subscription`,
    { method: "GET" },
  );
  if (!res.ok) return null;
  return (await res.json()) as EmergentCarrierSubscriptionResponse;
}
