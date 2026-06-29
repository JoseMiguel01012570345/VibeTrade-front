import type { CatalogReel } from './catalogReel'
import type { ReelComment } from './reelComment'

export type ReelsBootstrapPayload = {
  items: CatalogReel[]
  initialComments: Record<string, ReelComment[]>
  initialLikeCounts: Record<string, number>
}
