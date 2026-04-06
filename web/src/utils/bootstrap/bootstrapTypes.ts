import type { MarketSerializableSlice } from '../market/marketSerializable'
import type { ReelsBootstrapPayload } from '../reels/reelsBootstrapState'

export type BootstrapResponse = {
  market: MarketSerializableSlice
  reels: ReelsBootstrapPayload
  /** Nombres para rutas /profile/:id distintos del usuario de prueba local. */
  profileDisplayNames: Record<string, string>
}
