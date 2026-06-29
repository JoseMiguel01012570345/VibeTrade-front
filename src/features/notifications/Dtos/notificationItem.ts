export type NotificationItem = {
  id: string
  kind:
    | 'qa_reply'
    | 'payment'
    | 'system'
    | 'chat_message'
    | 'offer_comment'
    | 'offer_like'
    | 'qa_comment_like'
    | 'route_tramo_subscribe'
    | 'route_tramo_subscribe_accepted'
    | 'route_tramo_subscribe_rejected'
    | 'route_tramo_seller_expelled'
    | 'route_sheet_presel'
    | 'route_sheet_presel_decl'
    | 'route_ownership_granted'
    | 'store_trust_penalty'
    | 'peer_party_exited'
  title: string
  body: string
  createdAt: number
  read: boolean
  threadId?: string
  offerId?: string
  trustScore?: number
  routeSheetId?: string
  highlightCarrierUserId?: string
  stopId?: string
  preselStopIds?: string[]
  storeServiceId?: string
}

export type NotificationRouteMeta = Pick<
  NotificationItem,
  'routeSheetId' | 'stopId' | 'highlightCarrierUserId' | 'preselStopIds' | 'storeServiceId'
>
