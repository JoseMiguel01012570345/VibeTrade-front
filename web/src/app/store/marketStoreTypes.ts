import type {
  StoreCatalog,
  StoreProduct,
  StoreService,
} from '../../pages/chat/domain/storeCatalogTypes'
import type { TradeAgreement, TradeAgreementDraft } from '../../pages/chat/domain/tradeAgreementTypes'
import type { RouteSheet, RouteSheetCreatePayload, RouteSheetStatus } from '../../pages/chat/domain/routeSheetTypes'

export type { TradeAgreement, TradeAgreementDraft } from '../../pages/chat/domain/tradeAgreementTypes'
export type {
  RouteSheet,
  RouteSheetCreatePayload,
  RouteSheetStatus,
  RouteStop,
} from '../../pages/chat/domain/routeSheetTypes'

export type StoreBadge = {
  id: string
  name: string
  verified: boolean
  categories: string[]
  transportIncluded: boolean
  avatarUrl?: string
  trustScore: number
  /** Si existe, la tienda fue creada desde el perfil y solo ese usuario puede editarla. */
  ownerUserId?: string
}

/** Alta de tienda desde perfil (flow-ui: nombre, categorías, descripción, transporte). */
export type OwnerStoreFormValues = {
  name: string
  categories: string[]
  categoryPitch: string
  transportIncluded: boolean
}

/** Parcial permitido al actualizar tienda (incl. imagen de vitrina). */
export type OwnerStorePatch = Partial<
  OwnerStoreFormValues & { avatarUrl: string | null | undefined }
>

export type StoreProductInput = Omit<StoreProduct, 'id' | 'storeId'>
export type StoreServiceInput = Omit<StoreService, 'id' | 'storeId'>

export type QAItem = {
  id: string
  question: string
  askedBy: { id: string; name: string; trustScore: number }
  answeredBy?: { id: string; name: string; trustScore: number }
  answer?: string
  createdAt: number
}

export type Offer = {
  id: string
  storeId: string
  title: string
  price: string
  location: string
  tags: string[]
  imageUrl: string
  qa: QAItem[]
}

export type ReplyQuote = {
  id: string
  author: string
  preview: string
}

export type Message =
  | {
      id: string
      from: 'me' | 'other' | 'system'
      type: 'text'
      text: string
      at: number
      read?: boolean
      offerQaId?: string
      replyQuotes?: ReplyQuote[]
    }
  | {
      id: string
      from: 'me' | 'other'
      type: 'image'
      images: { url: string }[]
      at: number
      read?: boolean
      caption?: string
      embeddedAudio?: { url: string; seconds: number }
      replyQuotes?: ReplyQuote[]
    }
  | {
      id: string
      from: 'me' | 'other'
      type: 'audio'
      url: string
      seconds: number
      at: number
      read?: boolean
    }
  | {
      id: string
      from: 'me' | 'other'
      type: 'doc'
      name: string
      size: string
      kind: 'pdf' | 'doc' | 'other'
      url?: string
      at: number
      read?: boolean
      caption?: string
      replyQuotes?: ReplyQuote[]
    }
  | {
      id: string
      from: 'me' | 'other'
      type: 'docs'
      documents: {
        name: string
        size: string
        kind: 'pdf' | 'doc' | 'other'
        url?: string
      }[]
      caption?: string
      embeddedAudio?: { url: string; seconds: number }
      at: number
      read?: boolean
      replyQuotes?: ReplyQuote[]
    }
  | {
      id: string
      from: 'system'
      type: 'certificate'
      title: string
      body: string
      at: number
    }
  | {
      id: string
      from: 'other'
      type: 'agreement'
      agreementId: string
      title: string
      at: number
      read?: boolean
    }

export type Thread = {
  id: string
  offerId: string
  storeId: string
  store: StoreBadge
  purchaseMode?: boolean
  messages: Message[]
  contracts?: TradeAgreement[]
  routeSheets?: RouteSheet[]
  prematureExitUnderInvestigation?: boolean
  paymentCompleted?: boolean
  chatActionsLocked?: boolean
}

export function threadHasAcceptedAgreement(th: Thread): boolean {
  return (th.contracts ?? []).some((c) => c.status === 'accepted')
}

export function threadHasAcceptedAgreementUnpaid(th: Thread): boolean {
  return threadHasAcceptedAgreement(th) && !th.paymentCompleted
}

export type MarketState = {
  stores: Record<string, StoreBadge>
  offers: Record<string, Offer>
  offerIds: string[]
  /** Catálogo de tienda (productos/servicios de ficha) por id de negocio — flow-ui perfil & acuerdos. */
  storeCatalogs: Record<string, StoreCatalog>
  threads: Record<string, Thread>

  ask: (offerId: string, askedBy: { id: string; name: string; trustScore: number }, question: string) => string
  answer: (offerId: string, qaId: string, answer: string) => void
  ensureThreadForOffer: (offerId: string, opts?: { buyerId?: string }) => string
  syncThreadBuyerQa: (threadId: string, buyerId: string) => void
  sendText: (threadId: string, text: string, replyToIds?: string[]) => void
  sendAudio: (threadId: string, payload: { url: string; seconds: number }) => void
  sendDocument: (
    threadId: string,
    payload: { name: string; size: string; kind: 'pdf' | 'doc' | 'other'; url: string },
    options?: { replyToIds?: string[]; caption?: string },
  ) => void
  sendImages: (
    threadId: string,
    images: { url: string }[],
    options?: {
      replyToIds?: string[]
      caption?: string
      embeddedAudio?: { url: string; seconds: number }
    },
  ) => void
  sendDocsBundle: (
    threadId: string,
    payload: {
      documents: { name: string; size: string; kind: 'pdf' | 'doc' | 'other'; url: string }[]
      embeddedAudio?: { url: string; seconds: number }
    },
    options?: { replyToIds?: string[]; caption?: string },
  ) => void
  emitTradeAgreement: (threadId: string, draft: TradeAgreementDraft) => string | null
  /** Si `pending_buyer` o `rejected` (en ese caso pasa otra vez a pendiente). Emisor = tienda del hilo. */
  updatePendingTradeAgreement: (threadId: string, agreementId: string, draft: TradeAgreementDraft) => boolean
  respondTradeAgreement: (threadId: string, agreementId: string, response: 'accept' | 'reject') => void
  createRouteSheet: (threadId: string, payload: RouteSheetCreatePayload) => string | null
  updateRouteSheet: (threadId: string, routeSheetId: string, payload: RouteSheetCreatePayload) => boolean
  setRouteSheetStatus: (threadId: string, routeSheetId: string, estado: RouteSheetStatus) => void
  toggleRouteStop: (threadId: string, routeSheetId: string, stopId: string) => void
  publishRouteSheetsToPlatform: (threadId: string, routeSheetIds: string[]) => void
  linkAgreementToRouteSheet: (threadId: string, agreementId: string, routeSheetId: string) => boolean
  deleteRouteSheet: (threadId: string, routeSheetId: string) => boolean
  recordChatExitFromList: (threadId: string) => void
  /** Quita el hilo del estado local (lista del comprador / demo). */
  removeThreadFromList: (threadId: string) => void
  markThreadPaymentCompleted: (threadId: string) => void

  /** Tiendas creadas por el usuario (vendedor) — flow-ui perfil. */
  createOwnerStore: (ownerUserId: string, values: OwnerStoreFormValues) => string | null
  updateOwnerStore: (storeId: string, ownerUserId: string, values: OwnerStorePatch) => boolean
  deleteOwnerStore: (storeId: string, ownerUserId: string) => boolean
  addOwnerStoreProduct: (storeId: string, ownerUserId: string, product: StoreProductInput) => string | null
  updateOwnerStoreProduct: (
    storeId: string,
    ownerUserId: string,
    productId: string,
    product: StoreProductInput,
  ) => boolean
  removeOwnerStoreProduct: (storeId: string, ownerUserId: string, productId: string) => boolean
  setOwnerStoreProductPublished: (
    storeId: string,
    ownerUserId: string,
    productId: string,
    published: boolean,
  ) => boolean
  addOwnerStoreService: (storeId: string, ownerUserId: string, service: StoreServiceInput) => string | null
  updateOwnerStoreService: (
    storeId: string,
    ownerUserId: string,
    serviceId: string,
    service: StoreServiceInput,
  ) => boolean
  removeOwnerStoreService: (storeId: string, ownerUserId: string, serviceId: string) => boolean
}
