import { create } from 'zustand'

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
    }
  | {
      id: string
      from: 'system'
      type: 'certificate'
      title: string
      body: string
      at: number
    }

export type Thread = {
  id: string
  offerId: string
  storeId: string
  store: StoreBadge
  messages: Message[]
}

type MarketState = {
  stores: Record<string, StoreBadge>
  offers: Record<string, Offer>
  offerIds: string[]
  threads: Record<string, Thread>

  ask: (offerId: string, askedBy: { id: string; name: string; trustScore: number }, question: string) => string
  answer: (offerId: string, qaId: string, answer: string) => void
  ensureThreadForOffer: (offerId: string) => string
  sendText: (threadId: string, text: string, replyToIds?: string[]) => void
  sendAudio: (threadId: string, payload: { url: string; seconds: number }) => void
  sendDocument: (
    threadId: string,
    payload: { name: string; size: string; kind: 'pdf' | 'doc' | 'other'; url: string },
  ) => void
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
    case 'certificate':
      return m.title
    default:
      return ''
  }
}

function authorForMessage(m: Message, storeName: string): string {
  if (m.from === 'me') return 'Tú'
  if (m.from === 'other') return storeName
  return 'Sistema'
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
        askedBy: { id: 'u2', name: 'María', trustScore: 74 },
        answeredBy: { id: 's1', name: 'AgroNorte SRL', trustScore: 88 },
        answer: 'Sí, incluye embalaje estándar. Podemos cotizar reforzado.',
        createdAt: Date.now() - 1000 * 60 * 60 * 2,
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

    ensureThreadForOffer: (offerId) => {
      const s = get()
      const existing = Object.values(s.threads).find((t) => t.offerId === offerId)
      if (existing) return existing.id

      const offer = s.offers[offerId]
      const store = s.stores[offer.storeId]
      const id = uid('th')
      const bootstrap: Thread = {
        id,
        offerId,
        storeId: offer.storeId,
        store,
        messages: [
          {
            id: uid('m'),
            from: 'system',
            type: 'text',
            text:
              'Inicio de chat: credenciales del negocio y disponibilidad de transporte destacadas arriba.',
            at: Date.now() - 60_000,
          },
          {
            id: uid('m'),
            from: 'other',
            type: 'image',
            images: [
              { url: 'https://images.unsplash.com/photo-1604908177522-4028c7a2e08d?auto=format&fit=crop&w=800&q=80' },
              { url: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80' },
            ],
            at: Date.now() - 50_000,
            read: true,
          },
          {
            id: uid('m'),
            from: 'other',
            type: 'audio',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            seconds: 60,
            at: Date.now() - 45_000,
            read: true,
          },
          {
            id: uid('m'),
            from: 'other',
            type: 'doc',
            name: 'Especificaciones.pdf',
            size: '240 KB',
            kind: 'pdf',
            url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            at: Date.now() - 40_000,
            read: true,
          },
          {
            id: uid('m'),
            from: 'other',
            type: 'doc',
            name: 'Contrato borrador.docx',
            size: '88 KB',
            kind: 'doc',
            url: 'https://file-examples.com/wp-content/storage/2017/02/file_sample_100kB.docx',
            at: Date.now() - 35_000,
            read: true,
          },
        ],
      }
      set((x) => ({ ...x, threads: { ...x.threads, [id]: bootstrap } }))
      return id
    },

    sendText: (threadId, text, replyToIds) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th) return s
        const storeName = th.store.name
        const replyQuotes: ReplyQuote[] | undefined =
          replyToIds && replyToIds.length
            ? replyToIds
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
            : undefined
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

    sendDocument: (threadId, payload) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th) return s
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
        }
        return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
      })
    },
  }
})

