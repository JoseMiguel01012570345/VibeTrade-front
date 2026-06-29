import { apiFetch } from "@shared/services/http/apiClient"
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "@shared/services/http/apiErrorMessage"

export type { PublishedTransportServiceDto } from "../Dtos/publishedTransportServicesApiTypes";
import type { PublishedTransportServiceDto } from "../Dtos/publishedTransportServicesApiTypes";

export function summarizeTransportServiceForInvite(s: PublishedTransportServiceDto): string {
  const tipo = (s.tipoServicio ?? '').trim()
  const cat = (s.category ?? '').trim()
  const store = (s.storeName ?? '').trim()
  const core = [tipo, cat].filter(Boolean).join(' · ')
  if (core && store) return `${core} (${store})`
  if (core) return core
  if (store) return store
  return 'Servicio de transporte'
}

function normalizeServicesPayload(raw: unknown): PublishedTransportServiceDto[] {
  if (!raw || typeof raw !== 'object') return []
  const j = raw as { services?: unknown }
  const arr = j.services
  if (!Array.isArray(arr)) return []
  return arr.map((item) => {
    // Backend histórico: { service: {...}, storeName }; contrato actual: ficha plana + storeName.
    if (item && typeof item === 'object' && item !== null && 'service' in item) {
      const w = item as {
        service?: PublishedTransportServiceDto
        storeName?: string
      }
      return {
        ...(w.service ?? {}),
        storeName: w.storeName,
      } as PublishedTransportServiceDto
    }
    return item as PublishedTransportServiceDto
  })
}

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
  return normalizeServicesPayload(j)
}
