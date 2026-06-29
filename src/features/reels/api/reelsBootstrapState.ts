import type { ReelComment } from '../Dtos/reelComment'
import type { CatalogReel } from '../Dtos/catalogReel'
import type { ReelsBootstrapPayload } from '../Dtos/reelsBootstrapPayload'

export type { ReelsBootstrapPayload } from '../Dtos/reelsBootstrapPayload'

let payload: ReelsBootstrapPayload = {
  items: [],
  initialComments: {},
  initialLikeCounts: {},
}

export function setReelsBootstrap(p: ReelsBootstrapPayload) {
  payload = p
}

export function getReelsItems(): CatalogReel[] {
  return payload.items
}

export function getReelsInitialComments(): Record<string, ReelComment[]> {
  return payload.initialComments
}

export function getReelsInitialLikeCounts(): Record<string, number> {
  return payload.initialLikeCounts
}

export function reelTitlesById(): Record<string, string> {
  return Object.fromEntries(payload.items.map((r) => [r.id, r.title]))
}

export function reelsForStore(storeId: string): CatalogReel[] {
  return payload.items.filter((r) => r.storeId === storeId)
}
