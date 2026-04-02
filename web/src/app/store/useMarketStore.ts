import { create } from 'zustand'
import type { TradeAgreement, TradeAgreementDraft } from '../../pages/chat/tradeAgreementTypes'
import { emptyMerchandiseMeta, emptyServiceBlock } from '../../pages/chat/tradeAgreementTypes'
import { hasValidationErrors, validateTradeAgreementDraft } from '../../pages/chat/tradeAgreementValidation'
import {
  getRouteSheetFormErrors,
  hasRouteSheetFormErrors,
  normalizeRouteSheetParadas,
} from '../../pages/chat/routeSheetValidation'
import type {
  RouteSheet,
  RouteSheetCreatePayload,
  RouteSheetStatus,
  RouteStop,
} from '../../pages/chat/routeSheetTypes'
export type { TradeAgreement, TradeAgreementDraft } from '../../pages/chat/tradeAgreementTypes'
export type {
  RouteSheet,
  RouteSheetCreatePayload,
  RouteSheetStatus,
  RouteStop,
} from '../../pages/chat/routeSheetTypes'

export type StoreBadge = {
  id: string
  name: string
  verified: boolean
  categories: string[]
  transportIncluded: boolean
  avatarUrl?: string
  trustScore: number
}

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
      /** Mensajes generados desde Q&A de la oferta (sync al abrir Comprar). */
      offerQaId?: string
      /** Citas cuando este mensaje responde a uno o más mensajes anteriores */
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
      /** Public HTTPS URL for preview (PDF direct; Word via Office embed) */
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
  /** true cuando el comprador abre el chat desde «Comprar» (flujo de cierre). */
  purchaseMode?: boolean
  messages: Message[]
  /** Acuerdos emitidos en el hilo (vendedor → comprador). */
  contracts?: TradeAgreement[]
  /** Hojas de rutas logísticas del hilo (vinculables a contratos con mercancías). */
  routeSheets?: RouteSheet[]
}

type MarketState = {
  stores: Record<string, StoreBadge>
  offers: Record<string, Offer>
  offerIds: string[]
  threads: Record<string, Thread>

  ask: (offerId: string, askedBy: { id: string; name: string; trustScore: number }, question: string) => string
  answer: (offerId: string, qaId: string, answer: string) => void
  ensureThreadForOffer: (offerId: string, opts?: { buyerId?: string }) => string
  /** Incorpora al hilo la Q&A del comprador desde la oferta (p. ej. al volver a abrir el chat). */
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
  respondTradeAgreement: (threadId: string, agreementId: string, response: 'accept' | 'reject') => void
  createRouteSheet: (threadId: string, payload: RouteSheetCreatePayload) => string | null
  updateRouteSheet: (threadId: string, routeSheetId: string, payload: RouteSheetCreatePayload) => boolean
  setRouteSheetStatus: (threadId: string, routeSheetId: string, estado: RouteSheetStatus) => void
  toggleRouteStop: (threadId: string, routeSheetId: string, stopId: string) => void
  /** Marca como publicadas las hojas indicadas (solo las aún no publicadas; demo). */
  publishRouteSheetsToPlatform: (threadId: string, routeSheetIds: string[]) => void
  /** Vincula un acuerdo con mercancías a una hoja de ruta y notifica en el chat. */
  linkAgreementToRouteSheet: (
    threadId: string,
    agreementId: string,
    routeSheetId: string,
  ) => boolean
  /** Solo si no está publicada ni fue editada en formulario. Limpia vínculos en acuerdos. */
  deleteRouteSheet: (threadId: string, routeSheetId: string) => boolean
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function previewForMessage(m: Message): string {
  switch (m.type) {
    case 'text':
      return m.text.length > 96 ? `${m.text.slice(0, 96)}…` : m.text
    case 'image':
      return m.images.length > 1 ? `${m.images.length} fotos` : 'Foto'
    case 'audio':
      return 'Nota de voz'
    case 'doc':
      return m.name
    case 'docs':
      return m.documents.length > 1
        ? `${m.documents.length} documentos`
        : m.documents[0]?.name ?? 'Documento'
    case 'certificate':
      return m.title
    case 'agreement':
      return `Acuerdo: ${m.title}`
    default:
      return ''
  }
}

function authorForMessage(m: Message, storeName: string): string {
  if (m.from === 'me') return 'Tú'
  if (m.from === 'other') return storeName
  return 'Sistema'
}

function collectReplyQuotes(th: Thread, replyToIds: string[] | undefined): ReplyQuote[] | undefined {
  if (!replyToIds?.length) return undefined
  const storeName = th.store.name
  const list = replyToIds
    .map((id) => {
      const msg = th.messages.find((x) => x.id === id)
      if (!msg || msg.type === 'certificate') return null
      return {
        id: msg.id,
        author: authorForMessage(msg, storeName),
        preview: previewForMessage(msg),
      }
    })
    .filter((q): q is ReplyQuote => q !== null)
  return list.length ? list : undefined
}

function hasSeededQuestion(messages: Message[], q: QAItem): boolean {
  return messages.some((m) => {
    if (m.type !== 'text' || m.from !== 'me') return false
    if (m.offerQaId) return m.offerQaId === q.id
    return m.text === q.question
  })
}

function hasSeededAnswer(messages: Message[], q: QAItem): boolean {
  if (!q.answer) return true
  return messages.some((m) => {
    if (m.type !== 'text' || m.from !== 'other') return false
    if (m.offerQaId) return m.offerQaId === q.id
    return m.text === q.answer
  })
}

/** Añade al hilo las preguntas/respuestas del comprador que aún no estén reflejadas (p. ej. preguntó después del primer Comprar). */
function syncOwnQaIntoMessages(
  prev: Message[],
  offer: Offer,
  buyerId: string | undefined,
): Message[] {
  if (!buyerId) return prev

  const ownQa = [...offer.qa]
    .filter((q) => q.askedBy.id === buyerId)
    .sort((a, b) => a.createdAt - b.createdAt)

  let next = [...prev]
  let t = next.length ? Math.max(...next.map((m) => m.at)) + 1 : Date.now()

  for (const q of ownQa) {
    if (!hasSeededQuestion(next, q)) {
      next.push({
        id: uid('m'),
        from: 'me',
        type: 'text',
        text: q.question,
        at: t++,
        read: true,
        offerQaId: q.id,
      })
    }
    if (q.answer && !hasSeededAnswer(next, q)) {
      next.push({
        id: uid('m'),
        from: 'other',
        type: 'text',
        text: q.answer,
        at: t++,
        read: true,
        offerQaId: q.id,
      })
    }
  }

  return next
}

function buildPurchaseThreadMessages(offer: Offer, buyerId: string | undefined): Message[] {
  const messages: Message[] = []
  let seq = 0
  const base = Date.now() - 90_000

  messages.push({
    id: uid('m'),
    from: 'system',
    type: 'text',
    text: `Inicio de chat de compra · ${offer.title}. Credenciales del negocio y disponibilidad de transporte se destacan arriba.`,
    at: base + seq++ * 1000,
  })

  if (!buyerId) return messages

  const ownQa = [...offer.qa]
    .filter((q) => q.askedBy.id === buyerId)
    .sort((a, b) => a.createdAt - b.createdAt)

  for (const q of ownQa) {
    const tQ = base + seq++ * 1000
    const tA = base + seq++ * 1000

    messages.push({
      id: uid('m'),
      from: 'me',
      type: 'text',
      text: q.question,
      at: tQ,
      read: true,
      offerQaId: q.id,
    })

    if (q.answer) {
      messages.push({
        id: uid('m'),
        from: 'other',
        type: 'text',
        text: q.answer,
        at: tA,
        read: true,
        offerQaId: q.id,
      })
    }
  }

  return messages
}

const demoStores: Record<string, StoreBadge> = {
  s1: {
    id: 's1',
    name: 'AgroNorte SRL',
    verified: true,
    categories: ['Mercancías', 'Cosechas'],
    transportIncluded: false,
    trustScore: 88,
  },
  s2: {
    id: 's2',
    name: 'Flete Rápido',
    verified: false,
    categories: ['Transportista', 'Logística'],
    transportIncluded: true,
    trustScore: 63,
  },
  s3: {
    id: 's3',
    name: 'Logística Sur',
    verified: true,
    categories: ['Transportista', 'Carga general'],
    transportIncluded: true,
    trustScore: 71,
  },
}

const demoOffers: Offer[] = [
  {
    id: 'o1',
    storeId: 's1',
    title: 'Cosecha de Malanga (1 Ton)',
    price: 'USD 980',
    location: 'Misiones, AR',
    tags: ['Cosecha', 'Alimentos', 'B2B'],
    imageUrl:
      'https://images.unsplash.com/photo-1604908177522-4028c7a2e08d?auto=format&fit=crop&w=1200&q=80',
    qa: [
      {
        id: 'qa1',
        question: '¿Incluye embalaje?',
        askedBy: { id: 'me', name: 'Jhosef', trustScore: 72 },
        answeredBy: { id: 's1', name: 'AgroNorte SRL', trustScore: 88 },
        answer: 'Sí, incluye embalaje estándar. Podemos cotizar reforzado.',
        createdAt: Date.now() - 1000 * 60 * 60 * 2,
      },
      {
        id: 'qa2',
        question: '¿Entregan en zona norte?',
        askedBy: { id: 'u2', name: 'María', trustScore: 74 },
        answeredBy: { id: 's1', name: 'AgroNorte SRL', trustScore: 88 },
        answer: 'Sí, coordinamos logística.',
        createdAt: Date.now() - 1000 * 60 * 60 * 3,
      },
    ],
  },
  {
    id: 'o2',
    storeId: 's1',
    title: 'Semillas certificadas (Pack 100)',
    price: 'USD 120',
    location: 'Corrientes, AR',
    tags: ['Insumos', 'Certificado'],
    imageUrl:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80',
    qa: [],
  },
]

export const useMarketStore = create<MarketState>((set, get) => {
  const offers: Record<string, Offer> = Object.fromEntries(demoOffers.map((o) => [o.id, o]))

  return {
    stores: demoStores,
    offers,
    offerIds: demoOffers.map((o) => o.id),
    threads: {},

    ask: (offerId, askedBy, question) => {
      const qaId = uid('qa')
      set((s) => {
        const offer = s.offers[offerId]
        if (!offer) return s
        const next: Offer = {
          ...offer,
          qa: [
            {
              id: qaId,
              question,
              askedBy,
              createdAt: Date.now(),
            },
            ...offer.qa,
          ],
        }
        return { ...s, offers: { ...s.offers, [offerId]: next } }
      })
      return qaId
    },

    answer: (offerId, qaId, answerText) => {
      set((s) => {
        const offer = s.offers[offerId]
        if (!offer) return s
        const store = s.stores[offer.storeId]
        const next: Offer = {
          ...offer,
          qa: offer.qa.map((q) =>
            q.id === qaId
              ? {
                  ...q,
                  answer: answerText,
                  answeredBy: { id: store.id, name: store.name, trustScore: store.trustScore },
                }
              : q,
          ),
        }
        return { ...s, offers: { ...s.offers, [offerId]: next } }
      })
    },

    ensureThreadForOffer: (offerId, opts) => {
      const s = get()
      const offer = s.offers[offerId]
      if (!offer) return ''

      const existing = Object.values(s.threads).find((t) => t.offerId === offerId)
      const buyerId = opts?.buyerId

      if (existing) {
        const merged = syncOwnQaIntoMessages(existing.messages, offer, buyerId)
        if (merged.length !== existing.messages.length) {
          set((x) => ({
            ...x,
            threads: {
              ...x.threads,
              [existing.id]: {
                ...existing,
                messages: merged,
                contracts: existing.contracts ?? [],
                routeSheets: existing.routeSheets ?? [],
              },
            },
          }))
        }
        return existing.id
      }

      const store = s.stores[offer.storeId]
      const id = uid('th')
      const bootstrap: Thread = {
        id,
        offerId,
        storeId: offer.storeId,
        store,
        purchaseMode: true,
        messages: buildPurchaseThreadMessages(offer, buyerId),
        contracts: [],
        routeSheets: [],
      }
      set((x) => ({ ...x, threads: { ...x.threads, [id]: bootstrap } }))
      return id
    },

    syncThreadBuyerQa: (threadId, buyerId) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th?.purchaseMode) return s
        const offer = s.offers[th.offerId]
        if (!offer) return s
        const merged = syncOwnQaIntoMessages(th.messages, offer, buyerId)
        if (merged.length === th.messages.length) return s
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: {
              ...th,
              messages: merged,
              contracts: th.contracts ?? [],
              routeSheets: th.routeSheets ?? [],
            },
          },
        }
      })
    },

    emitTradeAgreement: (threadId, draft) => {
      if (hasValidationErrors(validateTradeAgreementDraft(draft))) return null
      const title = draft.title.trim()
      if (!title) return null
      const aid = uid('agr')
      set((s) => {
        const th = s.threads[threadId]
        if (!th) return s
        const agreement: TradeAgreement = {
          ...draft,
          title,
          id: aid,
          threadId,
          issuedAt: Date.now(),
          issuedByStoreId: th.storeId,
          issuerLabel: th.store.name,
          status: 'pending_buyer',
          merchandise: draft.includeMerchandise ? draft.merchandise : [],
          merchandiseMeta: draft.includeMerchandise ? draft.merchandiseMeta : emptyMerchandiseMeta(),
          service: draft.includeService ? draft.service : emptyServiceBlock(),
          routeSheetId: undefined,
        }
        const msg: Message = {
          id: uid('m'),
          from: 'other',
          type: 'agreement',
          agreementId: aid,
          title,
          at: Date.now(),
          read: false,
        }
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: {
              ...th,
              contracts: [...(th.contracts ?? []), agreement],
              messages: [...th.messages, msg],
              routeSheets: th.routeSheets ?? [],
            },
          },
        }
      })
      return aid
    },

    respondTradeAgreement: (threadId, agreementId, response) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th) return s
        const list = th.contracts ?? []
        const idx = list.findIndex((c) => c.id === agreementId)
        if (idx < 0) return s
        const ag = list[idx]
        if (ag.status !== 'pending_buyer') return s
        const nextContracts = [...list]
        nextContracts[idx] = {
          ...ag,
          status: response === 'accept' ? 'accepted' : 'rejected',
          respondedAt: Date.now(),
        }
        const sysText =
          response === 'accept'
            ? `Acuerdo «${ag.title}» aceptado por ambas partes. No puede derogarse; pueden emitirse nuevos contratos adicionales.`
            : `Acuerdo «${ag.title}» rechazado por el comprador.`
        const sys: Message = {
          id: uid('m'),
          from: 'system',
          type: 'text',
          text: sysText,
          at: Date.now(),
        }
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: {
              ...th,
              contracts: nextContracts,
              messages: [...th.messages, sys],
              routeSheets: th.routeSheets ?? [],
            },
          },
        }
      })
    },

    createRouteSheet: (threadId, payload) => {
      if (hasRouteSheetFormErrors(getRouteSheetFormErrors(payload))) return null
      const paradasNorm = normalizeRouteSheetParadas(payload.paradas)
      if (paradasNorm.length === 0) return null
      const titulo = payload.titulo.trim()
      const merc = payload.mercanciasResumen.trim()
      const paradas: RouteStop[] = paradasNorm
        .map((p, i) => ({
          id: uid('stop'),
          orden: i + 1,
          origen: p.origen.trim(),
          destino: p.destino.trim(),
          origenLat: p.origenLat?.trim() || undefined,
          origenLng: p.origenLng?.trim() || undefined,
          destinoLat: p.destinoLat?.trim() || undefined,
          destinoLng: p.destinoLng?.trim() || undefined,
          tiempoRecogidaEstimado: p.tiempoRecogidaEstimado?.trim() || undefined,
          tiempoEntregaEstimado: p.tiempoEntregaEstimado?.trim() || undefined,
          precioTransportista: p.precioTransportista?.trim() || undefined,
          cargaEnTramo: p.cargaEnTramo?.trim() || undefined,
          tipoMercanciaCarga: p.tipoMercanciaCarga?.trim() || undefined,
          tipoMercanciaDescarga: p.tipoMercanciaDescarga?.trim() || undefined,
          notas: p.notas?.trim() || undefined,
          completada: false,
        }))
      const rid = uid('ruta')
      const now = Date.now()
      const sheet: RouteSheet = {
        id: rid,
        threadId,
        titulo,
        creadoEn: now,
        actualizadoEn: now,
        estado: 'borrador',
        mercanciasResumen: merc,
        paradas,
        notasGenerales: payload.notasGenerales?.trim() || undefined,
        responsabilidadEmbalaje: payload.responsabilidadEmbalaje?.trim() || undefined,
        requisitosEspeciales: payload.requisitosEspeciales?.trim() || undefined,
        tipoVehiculoRequerido: payload.tipoVehiculoRequerido?.trim() || undefined,
        publicadaPlataforma: false,
        editadaEnFormulario: false,
      }
      set((s) => {
        const th = s.threads[threadId]
        if (!th) return s
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: {
              ...th,
              routeSheets: [...(th.routeSheets ?? []), sheet],
            },
          },
        }
      })
      return rid
    },

    updateRouteSheet: (threadId, routeSheetId, payload) => {
      if (hasRouteSheetFormErrors(getRouteSheetFormErrors(payload))) return false
      const paradasNorm = normalizeRouteSheetParadas(payload.paradas)
      if (paradasNorm.length === 0) return false
      const titulo = payload.titulo.trim()
      const merc = payload.mercanciasResumen.trim()
      const built = paradasNorm
        .map((p, i) => ({
          id: uid('stop'),
          orden: i + 1,
          origen: p.origen.trim(),
          destino: p.destino.trim(),
          origenLat: p.origenLat?.trim() || undefined,
          origenLng: p.origenLng?.trim() || undefined,
          destinoLat: p.destinoLat?.trim() || undefined,
          destinoLng: p.destinoLng?.trim() || undefined,
          tiempoRecogidaEstimado: p.tiempoRecogidaEstimado?.trim() || undefined,
          tiempoEntregaEstimado: p.tiempoEntregaEstimado?.trim() || undefined,
          precioTransportista: p.precioTransportista?.trim() || undefined,
          cargaEnTramo: p.cargaEnTramo?.trim() || undefined,
          tipoMercanciaCarga: p.tipoMercanciaCarga?.trim() || undefined,
          tipoMercanciaDescarga: p.tipoMercanciaDescarga?.trim() || undefined,
          notas: p.notas?.trim() || undefined,
          completada: false as boolean | undefined,
        }))
      let ok = false
      set((s) => {
        const th = s.threads[threadId]
        if (!th?.routeSheets) return s
        const idx = th.routeSheets.findIndex((rs) => rs.id === routeSheetId)
        if (idx < 0) return s
        const existing = th.routeSheets[idx]
        if (existing.publicadaPlataforma) return s
        const paradas: RouteStop[] = built.map((p, i) => ({
          ...p,
          id: existing.paradas[i]?.id ?? p.id,
          completada: existing.paradas[i]?.completada ?? false,
        }))
        const now = Date.now()
        const sheet: RouteSheet = {
          ...existing,
          titulo,
          mercanciasResumen: merc,
          paradas,
          notasGenerales: payload.notasGenerales?.trim() || undefined,
          responsabilidadEmbalaje: payload.responsabilidadEmbalaje?.trim() || undefined,
          requisitosEspeciales: payload.requisitosEspeciales?.trim() || undefined,
          tipoVehiculoRequerido: payload.tipoVehiculoRequerido?.trim() || undefined,
          actualizadoEn: now,
          editadaEnFormulario: true,
        }
        const list = [...th.routeSheets]
        list[idx] = sheet
        ok = true
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: { ...th, routeSheets: list },
          },
        }
      })
      return ok
    },

    setRouteSheetStatus: (threadId, routeSheetId, estado) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th?.routeSheets) return s
        const list = th.routeSheets.map((rs) =>
          rs.id === routeSheetId
            ? { ...rs, estado, actualizadoEn: Date.now() }
            : rs,
        )
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: { ...th, routeSheets: list },
          },
        }
      })
    },

    toggleRouteStop: (threadId, routeSheetId, stopId) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th?.routeSheets) return s
        const list = th.routeSheets.map((rs) => {
          if (rs.id !== routeSheetId) return rs
          return {
            ...rs,
            actualizadoEn: Date.now(),
            paradas: rs.paradas.map((p) =>
              p.id === stopId ? { ...p, completada: !p.completada } : p,
            ),
          }
        })
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: { ...th, routeSheets: list },
          },
        }
      })
    },

    publishRouteSheetsToPlatform: (threadId, routeSheetIds) => {
      const idSet = new Set(routeSheetIds)
      set((s) => {
        const th = s.threads[threadId]
        const sheets = th?.routeSheets
        if (!th || !sheets?.length) return s
        const now = Date.now()
        const list = sheets.map((rs) =>
          idSet.has(rs.id) && !rs.publicadaPlataforma
            ? { ...rs, publicadaPlataforma: true, actualizadoEn: now }
            : rs,
        )
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: { ...th, routeSheets: list },
          },
        }
      })
    },

    linkAgreementToRouteSheet: (threadId, agreementId, routeSheetId) => {
      let ok = false
      set((s) => {
        const th = s.threads[threadId]
        const contracts = th.contracts ?? []
        const sheets = th.routeSheets ?? []
        if (!th || !contracts.length || !sheets.length) return s
        const sheet = sheets.find((r) => r.id === routeSheetId)
        if (!sheet) return s
        const cIdx = contracts.findIndex((c) => c.id === agreementId)
        if (cIdx < 0) return s
        const prev = contracts[cIdx]
        if (prev.routeSheetId === routeSheetId) return s
        const nextContracts = [...contracts]
        nextContracts[cIdx] = { ...prev, routeSheetId }
        const sys: Message = {
          id: uid('m'),
          from: 'system',
          type: 'text',
          text: `Acuerdo «${prev.title}» vinculado a la hoja de ruta «${sheet.titulo}».`,
          at: Date.now(),
        }
        ok = true
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: {
              ...th,
              contracts: nextContracts,
              messages: [...th.messages, sys],
              routeSheets: th.routeSheets ?? [],
            },
          },
        }
      })
      return ok
    },

    deleteRouteSheet: (threadId, routeSheetId) => {
      let ok = false
      set((s) => {
        const th = s.threads[threadId]
        if (!th?.routeSheets?.length) return s
        const sheet = th.routeSheets.find((r) => r.id === routeSheetId)
        if (!sheet) return s
        if (sheet.publicadaPlataforma) return s
        if (sheet.editadaEnFormulario) return s
        const list = th.routeSheets.filter((r) => r.id !== routeSheetId)
        const contracts = (th.contracts ?? []).map((c) =>
          c.routeSheetId === routeSheetId ? { ...c, routeSheetId: undefined } : c,
        )
        const sys: Message = {
          id: uid('m'),
          from: 'system',
          type: 'text',
          text: `Se eliminó la hoja de ruta «${sheet.titulo}».`,
          at: Date.now(),
        }
        ok = true
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: {
              ...th,
              routeSheets: list,
              contracts,
              messages: [...th.messages, sys],
            },
          },
        }
      })
      return ok
    },

    sendText: (threadId, text, replyToIds) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th) return s
        const replyQuotes = collectReplyQuotes(th, replyToIds)
        const m: Message = {
          id: uid('m'),
          from: 'me',
          type: 'text',
          text: text.trim(),
          at: Date.now(),
          read: false,
          ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
        }
        return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
      })
    },

    sendAudio: (threadId, payload) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th) return s
        const m: Message = {
          id: uid('m'),
          from: 'me',
          type: 'audio',
          url: payload.url,
          seconds: Math.max(1, Math.round(payload.seconds)),
          at: Date.now(),
          read: false,
        }
        return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
      })
    },

    sendDocument: (threadId, payload, options) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th) return s
        const replyQuotes = collectReplyQuotes(th, options?.replyToIds)
        const cap = options?.caption?.trim()
        const m: Message = {
          id: uid('m'),
          from: 'me',
          type: 'doc',
          name: payload.name,
          size: payload.size,
          kind: payload.kind,
          url: payload.url,
          at: Date.now(),
          read: false,
          ...(cap ? { caption: cap } : {}),
          ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
        }
        return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
      })
    },

    sendImages: (threadId, images, options) => {
      if (!images.length) return
      set((s) => {
        const th = s.threads[threadId]
        if (!th) return s
        const replyQuotes = collectReplyQuotes(th, options?.replyToIds)
        const cap = options?.caption?.trim()
        const audio = options?.embeddedAudio
        const m: Message = {
          id: uid('m'),
          from: 'me',
          type: 'image',
          images,
          at: Date.now(),
          read: false,
          ...(cap ? { caption: cap } : {}),
          ...(audio
            ? {
                embeddedAudio: {
                  url: audio.url,
                  seconds: Math.max(1, Math.round(audio.seconds)),
                },
              }
            : {}),
          ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
        }
        return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
      })
    },

    sendDocsBundle: (threadId, payload, options) => {
      if (!payload.documents.length) return
      set((s) => {
        const th = s.threads[threadId]
        if (!th) return s
        const replyQuotes = collectReplyQuotes(th, options?.replyToIds)
        const cap = options?.caption?.trim()
        const audio = payload.embeddedAudio
        const m: Message = {
          id: uid('m'),
          from: 'me',
          type: 'docs',
          documents: payload.documents.map((d) => ({
            name: d.name,
            size: d.size,
            kind: d.kind,
            url: d.url,
          })),
          at: Date.now(),
          read: false,
          ...(cap ? { caption: cap } : {}),
          ...(audio ? { embeddedAudio: { url: audio.url, seconds: Math.max(1, Math.round(audio.seconds)) } } : {}),
          ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
        }
        return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
      })
    },
  }
})

