import type { StoreBadge } from "./marketTypes";
import type { StoreCatalog } from "./storeCatalogTypes";

export type StoreDetailOwner = {
  id: string
  name: string
  avatarUrl?: string
  trustScore: number
}

export type StoreDetailResponse = {
  store: StoreBadge
  catalog: StoreCatalog
  viewer?: { userId?: string | null; role?: string | null }
  owner?: StoreDetailOwner
}
