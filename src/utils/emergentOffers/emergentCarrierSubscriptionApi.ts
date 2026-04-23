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

/** POST: valida servicio de transporte en servidor y notifica al comprador y vendedor del hilo. */
export async function postEmergentTramoSubscriptionRequest(
  emergentOfferId: string,
  body: { stopId: string; storeServiceId: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(
    `/api/v1/emergent-offers/${encodeURIComponent(emergentOfferId)}/tramo-subscription-requests`,
    {
      method: "POST",
      body: JSON.stringify({
        stopId: body.stopId,
        storeServiceId: body.storeServiceId,
      }),
    },
  );
  if (res.status === 204) return { ok: true };
  let message = `No se pudo registrar la solicitud (HTTP ${res.status}).`;
  try {
    const j = (await res.json()) as { message?: string };
    if (j.message?.trim()) message = j.message.trim();
  } catch {
    /* ignore */
  }
  return { ok: false, message };
}
