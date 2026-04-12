import type { Offer } from '../../app/store/marketStoreTypes'
import type { MarketSerializableSlice } from '../market/marketSerializable'
import type { ReelsBootstrapPayload } from '../reels/reelsBootstrapState'

export type RecommendationBatch = {
  offerIds: string[]
  /** Cuerpo de cada oferta del lote (misma forma que `market.offers`). */
  offers?: Record<string, Offer>
  nextCursor: number
  totalAvailable: number
  batchSize: number
  threshold: number
  wrapped: boolean
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
