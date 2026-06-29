import type { StoreCustomAttachment } from '@features/market/model/storeCatalogTypes'

export type ProductPhotoSlot = {
  id: string
  url: string
  fileName: string
  /** Si existe, viene del upload; si no, se infiere de la URL al hidratar. */
  contentKind?: StoreCustomAttachment['kind']
}
