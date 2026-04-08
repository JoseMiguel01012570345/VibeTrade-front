import type { MarketState } from '../../app/store/marketStoreTypes'
import toast from 'react-hot-toast'
import { apiFetch } from '../http/apiClient'
import { marketDataSnapshot, type MarketSerializableSlice } from './marketSerializable'

let hydrating = true
let persistTimer: ReturnType<typeof setTimeout> | undefined
let lastPersistErrorToastAt = 0

export function setMarketHydrating(value: boolean) {
  hydrating = value
}

export async function saveMarketWorkspace(data: MarketSerializableSlice): Promise<void> {
  const res = await apiFetch('/api/v1/market/workspace', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    if (res.status === 409 && t) {
      const j = tryParseJsonBody(t)
      if (j?.message) throw new Error(j.message)
    }
    throw new Error(t || `PUT market failed: ${res.status}`)
  }
}

function tryParseJsonBody(s: string): { message?: string } | null {
  try {
    return JSON.parse(s) as { message?: string }
  } catch {
    return null
  }
}

export function subscribeMarketPersistence(store: {
  subscribe: (listener: (state: MarketState) => void) => () => void
}): void {
  store.subscribe((state) => {
    if (hydrating) return
    clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      void saveMarketWorkspace(marketDataSnapshot(state)).catch((e) => {
        console.error(e)
        // No spamear: si el payload es enorme (data URLs), el PUT puede fallar y el usuario cree que "se guardó".
        const now = Date.now()
        if (now - lastPersistErrorToastAt > 15_000) {
          lastPersistErrorToastAt = now
          const msg =
            e instanceof Error && e.message && !e.message.startsWith('PUT market failed')
              ? e.message
              : 'No se pudo guardar el catálogo en el servidor. Si recargás, podés perder cambios.'
          toast.error(msg)
        }
      })
    }, 600)
  })
}
