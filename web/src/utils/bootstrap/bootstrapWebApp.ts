import toast from 'react-hot-toast'
import { useAppStore } from '../../app/store/useAppStore'
import { useMarketStore } from '../../app/store/useMarketStore'
import type { ReelComment } from '../../pages/reels/ReelCommentsPanel'
import { apiFetch } from '../http/apiClient'
import { getSessionToken } from '../http/sessionToken'
import { setMarketHydrating, subscribeMarketPersistence } from '../market/marketPersistence'
import { setReelsBootstrap } from '../reels/reelsBootstrapState'
import type { BootstrapResponse } from './bootstrapTypes'

let persistenceStarted = false

function normalizeReelsCovers(items: BootstrapResponse['reels']['items']) {
  return items.map((r) => ({
    ...r,
    cover:
      r.cover ??
      'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80',
  }))
}

function normalizeReelsComments(comments: Record<string, ReelComment[]>) {
  const base = Date.now()
  let n = 0
  const out: Record<string, ReelComment[]> = {}
  for (const [k, list] of Object.entries(comments)) {
    out[k] = list.map((c) => ({
      ...c,
      at: typeof c.at === 'number' && c.at > 1_000_000_000_000 ? c.at : base - ++n * 60_000,
    }))
  }
  return out
}

export async function bootstrapWebApp(): Promise<void> {
  const token = getSessionToken()
  const active = useAppStore.getState().isSessionActive
  if (!token || !active) {
    // No sesión: evitar pegarle al backend. El SessionGate llevará a onboarding.
    // Dejamos estado consistente (vacío) sin iniciar persistencia.
    setMarketHydrating(true)
    useMarketStore.setState({
      stores: {},
      offers: {},
      offerIds: [],
      storeCatalogs: {},
      threads: {},
      routeOfferPublic: {},
    })
    setMarketHydrating(false)
    useAppStore.setState({ profileDisplayNames: {} })
    setReelsBootstrap({ items: [], initialComments: {}, initialLikeCounts: {} })
    return
  }

  const res = await apiFetch('/api/v1/bootstrap')
  if (!res.ok) {
    const msg = `No se pudo cargar datos (${res.status}). ¿Está el backend en marcha?`
    toast.error(msg)
    throw new Error(msg)
  }
  const json = (await res.json()) as BootstrapResponse

  setMarketHydrating(true)
  useMarketStore.setState({
    stores: json.market.stores,
    offers: json.market.offers,
    offerIds: json.market.offerIds,
    storeCatalogs: json.market.storeCatalogs,
    threads: json.market.threads,
    routeOfferPublic: json.market.routeOfferPublic,
  })
  setMarketHydrating(false)

  useAppStore.setState({
    profileDisplayNames: json.profileDisplayNames ?? {},
  })

  setReelsBootstrap({
    ...json.reels,
    items: normalizeReelsCovers(json.reels.items),
    initialComments: normalizeReelsComments(json.reels.initialComments),
  })

  if (!persistenceStarted) {
    persistenceStarted = true
    subscribeMarketPersistence(useMarketStore)
  }
}
