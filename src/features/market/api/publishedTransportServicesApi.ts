import { apiFetch } from "@shared/services/http/apiClient"
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "@shared/services/http/apiErrorMessage"

export type { PublishedTransportServiceDto } from "../Dtos/publishedTransportServicesApiTypes";
import type { PublishedTransportServiceDto } from "../Dtos/publishedTransportServicesApiTypes";
import { normalizePublishedTransportServicesPayload } from "../logic/publishedTransportServicesMapper";

export async function fetchPublishedTransportServicesForUser(
  userId: string,
): Promise<PublishedTransportServiceDto[]> {
  const res = await apiFetch(
    `/api/v1/market/users/${encodeURIComponent(userId)}/published-transport-services`,
  )
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()))
  }
  const j = await res.json()
  return normalizePublishedTransportServicesPayload(j)
}
