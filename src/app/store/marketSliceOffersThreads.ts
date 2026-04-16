import type { TradeAgreement } from '../../pages/chat/domain/tradeAgreementTypes'
import { normalizeMerchandiseLine } from '../../pages/chat/domain/tradeAgreementTypes'
import { hasValidationErrors, validateTradeAgreementDraft } from '../../pages/chat/domain/tradeAgreementValidation'
import { postOfferInquiry } from '../../utils/market/marketPersistence'
import type { MarketState, Offer, Message, QAItem, Thread } from './marketStoreTypes'
import {
  threadHasAcceptedAgreement,
  threadHasAcceptedAgreementUnpaid,
} from './marketStoreTypes'
import {
  buildPurchaseThreadMessages,
  syncOwnQaIntoMessages,
  threadIsActionLocked,
  uid,
} from './marketStoreHelpers'
import { routeSheetHasConfirmedCarriers } from './marketSliceHelpers'
import type { MarketSliceGet, MarketSliceSet } from './marketSliceTypes'

export function createOffersThreadsSlice(set: MarketSliceSet, get: MarketSliceGet): Pick<MarketState,
  | 'ask'
  | 'submitOfferQuestion'
  | 'answer'
  | 'ensureThreadForOffer'
  | 'syncThreadBuyerQa'
  | 'emitTradeAgreement'
  | 'updatePendingTradeAgreement'
  | 'deleteTradeAgreement'
  | 'respondTradeAgreement'
  | 'recordChatExitFromList'
  | 'removeThreadFromList'
  | 'markThreadPaymentCompleted'
> {
  return {
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
        ...(offer.qa ?? []),
      ],
    }
    return { ...s, offers: { ...s.offers, [offerId]: next } }
  })
  return qaId
},

submitOfferQuestion: async (offerId, askedBy, question) => {
  const s = get()
  if (!s.offers[offerId]) throw new Error('offer_not_found')
  const created = await postOfferInquiry({
    offerId,
    question,
    askedBy,
    createdAt: Date.now(),
  })
  const item: QAItem = {
    id: created.id,
    question: created.question,
    askedBy: created.askedBy,
    createdAt: created.createdAt,
  }
  set((state) => {
    const offer = state.offers[offerId]
    if (!offer) return state
    const nextOffer: Offer = {
      ...offer,
      qa: [item, ...(offer.qa ?? [])],
    }
    return {
      ...state,
      offers: { ...state.offers, [offerId]: nextOffer },
    }
  })
},

answer: (offerId, qaId, answerText) => {
  set((s) => {
    const offer = s.offers[offerId]
    if (!offer) return s
    const store = s.stores[offer.storeId]
    const next: Offer = {
      ...offer,
      qa: (offer.qa ?? []).map((q) =>
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
    if (!th?.purchaseMode || threadIsActionLocked(th)) return s
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
  if (threadIsActionLocked(get().threads[threadId])) return null
  const title = draft.title.trim()
  if (!title) return null
  const aid = uid('agr')
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const agreement: TradeAgreement = {
      ...draft,
      title,
      id: aid,
      threadId,
      issuedAt: Date.now(),
      issuedByStoreId: th.storeId,
      issuerLabel: th.store.name,
      status: 'pending_buyer',
      merchandise: draft.includeMerchandise
        ? draft.merchandise.map((l) => normalizeMerchandiseLine(l))
        : [],
      services: draft.includeService ? draft.services : [],
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

updatePendingTradeAgreement: (threadId, agreementId, draft) => {
  if (hasValidationErrors(validateTradeAgreementDraft(draft))) return false
  if (threadIsActionLocked(get().threads[threadId])) return false
  const title = draft.title.trim()
  if (!title) return false
  let applied = false
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const list = th.contracts ?? []
    const idx = list.findIndex((c) => c.id === agreementId)
    if (idx < 0) return s
    const ag = list[idx]
    if (ag.status !== 'pending_buyer' && ag.status !== 'rejected' && ag.status !== 'accepted') return s
    if (ag.issuedByStoreId !== th.storeId) return s
    if (ag.sellerEditBlockedUntilBuyerResponse) return s
    applied = true
    const wasRejected = ag.status === 'rejected'
    const wasAccepted = ag.status === 'accepted'
    let nextRouteSheetId = ag.routeSheetId
    let unlinkedByRevise = false
    if (ag.routeSheetId && !routeSheetHasConfirmedCarriers(s.routeOfferPublic, th, ag.routeSheetId)) {
      nextRouteSheetId = undefined
      unlinkedByRevise = true
    }
    const nextContracts = [...list]
    nextContracts[idx] = {
      ...ag,
      title,
      includeMerchandise: draft.includeMerchandise,
      includeService: draft.includeService,
      merchandise: draft.includeMerchandise
        ? draft.merchandise.map((l) => normalizeMerchandiseLine(l))
        : [],
      services: draft.includeService ? draft.services : [],
      service: undefined,
      routeSheetId: nextRouteSheetId,
      status: 'pending_buyer',
      respondedAt: undefined,
      sellerEditBlockedUntilBuyerResponse: true,
    }
    const nextMessages = th.messages.map((m) =>
      m.type === 'agreement' && m.agreementId === agreementId ? { ...m, title } : m,
    )
    let sysText: string
    if (wasAccepted) {
      sysText = `El vendedor modificó el acuerdo «${title}», que estaba aceptado: vuelve a estar pendiente de aceptación del comprador, quien puede aceptarlo o rechazarlo sin abandonar el chat.`
      if (unlinkedByRevise) {
        sysText += ` Se desvinculó la hoja de ruta del acuerdo porque en esa hoja aún no había transportistas con tramo confirmado.`
      }
    } else if (wasRejected) {
      sysText = `El vendedor revisó el acuerdo «${title}» tras el rechazo; volvió a quedar pendiente de respuesta del comprador.`
      if (unlinkedByRevise) {
        sysText += ` Se desvinculó la hoja de ruta vinculada (sin transportistas confirmados en esa hoja).`
      }
    } else {
      sysText = `El vendedor actualizó el acuerdo «${title}» (sigue pendiente de respuesta del comprador).`
      if (unlinkedByRevise) {
        sysText += ` Se desvinculó la hoja de ruta vinculada (sin transportistas confirmados en esa hoja).`
      }
    }
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
          messages: [...nextMessages, sys],
          routeSheets: th.routeSheets ?? [],
        },
      },
    }
  })
  return applied
},

deleteTradeAgreement: (threadId, agreementId) => {
  let ok = false
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const list = th.contracts ?? []
    const idx = list.findIndex((c) => c.id === agreementId)
    if (idx < 0) return s
    const ag = list[idx]
    if (ag.status === 'accepted') return s
    if (ag.issuedByStoreId !== th.storeId) return s
    const sheetCount = th.routeSheets?.length ?? 0
    if (sheetCount > list.length - 1) return s
    const title = ag.title
    const nextContracts = list.filter((c) => c.id !== agreementId)
    const sys: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: `Se eliminó el acuerdo «${title}» del hilo (no aplica a acuerdos ya aceptados).`,
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

respondTradeAgreement: (threadId, agreementId, response) => {
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
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
      sellerEditBlockedUntilBuyerResponse: false,
    }
    const sysText =
      response === 'accept'
        ? `Acuerdo «${ag.title}» aceptado por ambas partes. El vendedor puede proponer una nueva versión editándolo; eso reabre la aceptación del comprador. Pueden coexistir otros contratos adicionales.`
        : `Acuerdo «${ag.title}» rechazado por el comprador. El comprador permanece en el chat; pueden seguir negociando o el vendedor puede enviar una nueva versión.`
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
          prematureExitUnderInvestigation:
            response === 'accept' ? false : th.prematureExitUnderInvestigation,
        },
      },
    }
  })
},

recordChatExitFromList: (threadId) => {
  set((s) => {
    const th = s.threads[threadId]
    if (!th) return s
    const next: Partial<Pick<Thread, 'prematureExitUnderInvestigation' | 'chatActionsLocked'>> = {}
    // Sin acuerdo aceptado: salir no marca investigación ni obliga sanción de confianza (demo).
    // Con acuerdo aceptado: salida prematura puede revisarse.
    if (threadHasAcceptedAgreement(th)) {
      next.prematureExitUnderInvestigation = true
    }
    if (threadHasAcceptedAgreementUnpaid(th)) {
      next.chatActionsLocked = true
    }
    if (Object.keys(next).length === 0) return s
    return {
      ...s,
      threads: {
        ...s.threads,
        [threadId]: { ...th, ...next },
      },
    }
  })
},

removeThreadFromList: (threadId) => {
  set((s) => {
    if (!s.threads[threadId]) return s
    const { [threadId]: _removed, ...rest } = s.threads
    return { ...s, threads: rest }
  })
},

markThreadPaymentCompleted: (threadId) => {
  set((s) => {
    const th = s.threads[threadId]
    if (!th) return s
    return {
      ...s,
      threads: {
        ...s.threads,
        [threadId]: {
          ...th,
          paymentCompleted: true,
          chatActionsLocked: false,
        },
      },
    }
  })
},
  }
}
