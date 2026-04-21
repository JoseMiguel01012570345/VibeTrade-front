import type { Offer, StoreBadge } from '../../app/store/marketStoreTypes'
import type { MarketSerializableSlice } from '../market/marketSerializable'
import type { ReelsBootstrapPayload } from '../reels/reelsBootstrapState'

export type RecommendationBatch = {
  /** Orden del ranking; puede repetir ids (el mapa `offers` solo tiene una entrada por id). */
  offerIds: string[]
  /** Cuerpo de cada oferta del lote (misma forma que `market.offers`). */
  offers?: Record<string, Offer>
  /** Fichas de tienda del lote (p. ej. `websiteUrl` actualizado). */
  storeBadges?: Record<string, StoreBadge>
  batchSize: number
  threshold: number
}

export type BootstrapResponse = {
  market: MarketSerializableSlice
  reels: ReelsBootstrapPayload
  /** Nombres para rutas /profile/:id distintos del usuario de prueba local. */
  profileDisplayNames: Record<string, string>
  /** Ids de producto/servicio guardados (servidor; excluye propias y rotos). */
  savedOfferIds: string[]
  recommendations: RecommendationBatch
}
