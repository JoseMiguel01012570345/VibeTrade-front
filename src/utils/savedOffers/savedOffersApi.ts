import { apiFetch } from '../http/apiClient'
import { apiErrorTextToUserMessage } from '../http/apiErrorMessage'

async function readSavedOfferIdsResponse(res: Response): Promise<string[]> {
  const text = await res.text()
  if (!res.ok) {
    throw new Error(apiErrorTextToUserMessage(text))
  }
  const json = JSON.parse(text) as { savedOfferIds?: string[] }
  return Array.isArray(json.savedOfferIds) ? json.savedOfferIds : []
}

/** POST solo envía `{ productId }`. Devuelve la lista completa persistida. */
export async function postSavedOffer(productId: string): Promise<string[]> {
  const res = await apiFetch('/api/v1/me/saved-offers', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  })
  return readSavedOfferIdsResponse(res)
}

export async function deleteSavedOffer(productId: string): Promise<string[]> {
  const encoded = encodeURIComponent(productId)
  const res = await apiFetch(`/api/v1/me/saved-offers/${encoded}`, {
    method: 'DELETE',
  })
  return readSavedOfferIdsResponse(res)
}
