export type TrustHistoryItemApi = {
  id: string
  at: string
  delta: number
  balanceAfter: number
  reason: string
}

export type TrustAdjustResponseApi = {
  trustScore: number
  entry: TrustHistoryItemApi
}
