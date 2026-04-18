import type { TradeAgreement } from '../../pages/chat/domain/tradeAgreementTypes'
import { normalizeMerchandiseLine } from '../../pages/chat/domain/tradeAgreementTypes'
import { hasValidationErrors, validateTradeAgreementDraft } from '../../pages/chat/domain/tradeAgreementValidation'
import { fetchOfferQaFromServer, postOfferInquiry } from '../../utils/market/marketPersistence'
import {
  CHAT_CANNOT_MESSAGE_SELF,
  createOrGetChatThread,
  deleteChatThread,
  fetchChatMessages,
  fetchChatThread,
  fetchChatThreadByOffer,
  type ChatMessageDto,
  type ChatThreadDto,
} from '../../utils/chat/chatApi'
import { disconnectFromChatThread } from '../../utils/chat/chatRealtime'
import {
  mapChatMessageDtoToMessage,
  mergePersistedChatMessages,
} from '../../utils/chat/chatMerge'
import {
  mergeBuyerLabelFromThreadDto,
  mergeChatSenderLabelsIntoProfileStore,
} from '../../utils/chat/chatSenderLabels'
import { getSessionToken } from '../../utils/http/sessionToken'
import type { MarketState, Offer, Message, QAItem, Thread } from './marketStoreTypes'
import {
  threadHasAcceptedAgreement,
  threadHasAcceptedAgreementUnpaid,
} from './marketStoreTypes'
import {
  buildPurchaseThreadMessages,
  buildPurchaseThreadSystemOnly,
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
  | 'applyOfferQaFromServer'
  | 'refreshOfferQaFromServer'
  | 'onThreadCreatedFromServer'
  | 'emitTradeAgreement'
  | 'updatePendingTradeAgreement'
  | 'deleteTradeAgreement'
  | 'respondTradeAgreement'
  | 'recordChatExitFromList'
  | 'removeThreadFromList'
  | 'markThreadPaymentCompleted'
> {
  return {
onThreadCreatedFromServer: (dto: ChatThreadDto) => {
  mergeBuyerLabelFromThreadDto(dto)
  set((s) => {
    if (s.threads[dto.id]) return s
    const store = s.stores[dto.storeId]
    if (!store) return s
    return {
      ...s,
      threads: {
        ...s.threads,
        [dto.id]: {
          id: dto.id,
          offerId: dto.offerId,
          storeId: dto.storeId,
          store,
          buyerUserId: dto.buyerUserId,
          sellerUserId: dto.sellerUserId,
          purchaseMode: dto.purchaseMode,
          messages: [],
          contracts: [],
          routeSheets: [],
        },
      },
    }
  })
},

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

submitOfferQuestion: async (offerId, askedBy, question, options) => {
  const s = get()
  if (!s.offers[offerId]) throw new Error('offer_not_found')
  const q = question.trim()
  const parentId = options?.parentId?.trim() || undefined
  const created = await postOfferInquiry({
    offerId,
    question: q,
    text: q,
    ...(parentId ? { parentId } : {}),
    askedBy,
    createdAt: Date.now(),
  })
  const item: QAItem = {
    id: created.id,
    question: created.question ?? q,
    text: created.text ?? created.question ?? q,
    askedBy: created.askedBy,
    createdAt: created.createdAt,
    ...(created.parentId != null && created.parentId !== ''
      ? { parentId: created.parentId }
      : parentId
        ? { parentId }
        : {}),
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

ensureThreadForOffer: async (offerId, opts) => {
  const s = get()
  const offer = s.offers[offerId]
  if (!offer) return ''

  const existing = Object.values(s.threads).find((t) => t.offerId === offerId)
  const buyerId = opts?.buyerId
  const token = getSessionToken()
  const canPersist = !!token && !!buyerId && buyerId !== 'guest'
  const store = s.stores[offer.storeId]
  const meId = buyerId ?? ''

  const applyHydratedThread = (
    threadId: string,
    serverMsgs: ChatMessageDto[],
    baseThread: Thread,
    purchaseModeOverride?: boolean,
    participantDto?: Pick<
      ChatThreadDto,
      | 'buyerUserId'
      | 'sellerUserId'
      | 'buyerDisplayName'
      | 'buyerAvatarUrl'
    >,
  ) => {
    mergeChatSenderLabelsIntoProfileStore(serverMsgs)
    if (participantDto) mergeBuyerLabelFromThreadDto(participantDto)
    const mapped = serverMsgs.map((d) => mapChatMessageDtoToMessage(d, meId))
    const mergedMsgs = mergePersistedChatMessages(mapped, baseThread.messages)
    const sellerUserId =
      participantDto?.sellerUserId ?? get().stores[offer.storeId]?.ownerUserId
    const qaSynced = syncOwnQaIntoMessages(mergedMsgs, offer, buyerId, sellerUserId)
    set((x) => {
      const nextThreads = { ...x.threads }
      if (existing && existing.id !== threadId) delete nextThreads[existing.id]
      nextThreads[threadId] = {
        ...baseThread,
        id: threadId,
        ...(purchaseModeOverride !== undefined
          ? { purchaseMode: purchaseModeOverride }
          : {}),
        ...(participantDto
          ? {
              buyerUserId: participantDto.buyerUserId,
              sellerUserId: participantDto.sellerUserId,
              ...(participantDto.buyerDisplayName?.trim()
                ? { buyerDisplayName: participantDto.buyerDisplayName.trim() }
                : {}),
              ...(participantDto.buyerAvatarUrl?.trim()
                ? { buyerAvatarUrl: participantDto.buyerAvatarUrl.trim() }
                : {}),
            }
          : {}),
        messages: qaSynced,
        contracts: baseThread.contracts ?? [],
        routeSheets: baseThread.routeSheets ?? [],
      }
      return { ...x, threads: nextThreads }
    })
  }

  if (canPersist) {
    try {
      if (existing?.id.startsWith('cth_')) {
        const serverMsgs = await fetchChatMessages(existing.id)
        const th = get().threads[existing.id]
        if (th) {
          try {
            const dto = await fetchChatThread(existing.id)
            applyHydratedThread(existing.id, serverMsgs, th, dto.purchaseMode, dto)
          } catch {
            applyHydratedThread(existing.id, serverMsgs, th)
          }
        }
        return existing.id
      }

      const isSeller = store.ownerUserId === meId
      if (isSeller) {
        const dto = await fetchChatThreadByOffer(offerId)
        if (!dto) return ''
        const serverMsgs = await fetchChatMessages(dto.id)
        const bootstrap: Thread = existing
          ? { ...existing, id: dto.id }
          : {
              id: dto.id,
              offerId,
              storeId: offer.storeId,
              store,
              purchaseMode: dto.purchaseMode,
              messages: dto.purchaseMode
                ? buildPurchaseThreadSystemOnly(offer)
                : [],
              contracts: [],
              routeSheets: [],
            }
        applyHydratedThread(dto.id, serverMsgs, bootstrap, dto.purchaseMode, dto)
        return dto.id
      }

      const dto = await createOrGetChatThread(offerId, true)
      const serverMsgs = await fetchChatMessages(dto.id)
      const bootstrap: Thread = {
        id: dto.id,
        offerId,
        storeId: offer.storeId,
        store,
        purchaseMode: dto.purchaseMode,
        messages: dto.purchaseMode
          ? buildPurchaseThreadSystemOnly(offer)
          : [],
        contracts: existing?.contracts ?? [],
        routeSheets: existing?.routeSheets ?? [],
      }
      applyHydratedThread(dto.id, serverMsgs, bootstrap, dto.purchaseMode, dto)
      return dto.id
    } catch (e) {
      if (e instanceof Error && e.message === CHAT_CANNOT_MESSAGE_SELF) return ''
      /* fallback local */
    }
  }

  if (existing) {
    const merged = syncOwnQaIntoMessages(
      existing.messages,
      offer,
      buyerId,
      existing.sellerUserId ?? store?.ownerUserId,
    )
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

  if (store?.ownerUserId && buyerId && store.ownerUserId === buyerId) return ''

  const id = uid('th')
  const bootstrap: Thread = {
    id,
    offerId,
    storeId: offer.storeId,
    store,
    purchaseMode: true,
    messages: buildPurchaseThreadMessages(offer, buyerId, store?.ownerUserId),
    contracts: [],
    routeSheets: [],
  }
  set((x) => ({ ...x, threads: { ...x.threads, [id]: bootstrap } }))
  return id
},

syncThreadBuyerQa: (threadId, buyerId) => {
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const offer = s.offers[th.offerId]
    if (!offer) return s
    const sellerUserId = th.sellerUserId ?? s.stores[offer.storeId]?.ownerUserId
    const merged = syncOwnQaIntoMessages(th.messages, offer, buyerId, sellerUserId)
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

applyOfferQaFromServer: (offerId, qa) => {
  set((s) => {
    const offer = s.offers[offerId]
    if (!offer) return s
    return {
      ...s,
      offers: {
        ...s.offers,
        [offerId]: { ...offer, qa },
      },
    }
  })
  queueMicrotask(() => {
    const st = get()
    for (const th of Object.values(st.threads)) {
      if (th.offerId !== offerId) continue
      const buyerId = th.buyerUserId
      if (buyerId) get().syncThreadBuyerQa(th.id, buyerId)
    }
  })
},

refreshOfferQaFromServer: async (offerId) => {
  try {
    const qa = await fetchOfferQaFromServer(offerId)
    if (qa === null) return
    get().applyOfferQaFromServer(offerId, qa)
  } catch {
    /* offline / error */
  }
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

removeThreadFromList: async (threadId) => {
  if (threadId.startsWith('cth_')) {
    void disconnectFromChatThread(threadId)
    if (getSessionToken()) {
      try {
        await deleteChatThread(threadId)
      } catch (e) {
        console.error(e)
      }
    }
  }
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
