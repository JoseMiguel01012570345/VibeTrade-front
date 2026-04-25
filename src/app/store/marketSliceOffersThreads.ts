import type { TradeAgreement } from '../../pages/chat/domain/tradeAgreementTypes'
import { normalizeMerchandiseLine } from '../../pages/chat/domain/tradeAgreementTypes'
import { hasValidationErrors, validateTradeAgreementDraft } from '../../pages/chat/domain/tradeAgreementValidation'
import { fetchOfferQaFromServer, postOfferInquiry } from '../../utils/market/marketPersistence'
import type { RouteSheetPayload } from '../../pages/chat/domain/routeSheetTypes'
import {
  CHAT_CANNOT_MESSAGE_SELF,
  createOrGetChatThread,
  deleteChatThread,
  deleteThreadTradeAgreement,
  fetchChatMessages,
  fetchChatThread,
  fetchChatThreadByOffer,
  fetchThreadRouteSheets,
  fetchThreadTradeAgreements,
  patchThreadTradeAgreement,
  postThreadTradeAgreement,
  postThreadTradeAgreementRespond,
  type ChatMessageDto,
  type ChatThreadDto,
} from '../../utils/chat/chatApi'
import { mapTradeAgreementApiToTradeAgreement } from '../../utils/chat/tradeAgreementApiMapper'
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
import { resolveBuyerUserId, resolveSellerUserId } from '../../utils/chat/chatParticipantLabels'
import {
  CHAT_PARTY_EXIT_TRUST_PER_MEMBER,
} from '../../pages/chat/components/modals/TrustRiskEditConfirmModal'
import {
  counterpartyAlreadyRecordedPartyExitFromThread,
  peerPartyExitFromDto,
} from '../../utils/chat/threadPeerPartyExit'
import { isOfferPublishedForBuyerChat } from '../../utils/market/offerPublishedForBuyerChat'
import { useAppStore } from './useAppStore'

async function syncPersistedAgreementsAndMessages(
  set: MarketSliceSet,
  get: MarketSliceGet,
  threadId: string,
) {
  const th = get().threads[threadId]
  if (!th || !threadId.startsWith('cth_')) return
  const offer = get().offers[th.offerId]
  const meId = useAppStore.getState().me.id
  try {
    const [agreements, serverMsgs, routeSheetsRs] = await Promise.all([
      fetchThreadTradeAgreements(threadId),
      fetchChatMessages(threadId),
      fetchThreadRouteSheets(threadId).catch(() => [] as RouteSheetPayload[]),
    ])
    const contracts = agreements.map(mapTradeAgreementApiToTradeAgreement)
    const validAgreementIds = new Set(contracts.map((c) => c.id))
    mergeChatSenderLabelsIntoProfileStore(serverMsgs)
    const mapped = serverMsgs.map((d) => mapChatMessageDtoToMessage(d, meId))
    const mergedMsgs = mergePersistedChatMessages(mapped, th.messages, {
      validTradeAgreementIds: validAgreementIds,
    })
    const sellerUserId = th.sellerUserId ?? get().stores[th.storeId]?.ownerUserId
    const threadBuyerId = th.buyerUserId ?? resolveBuyerUserId(th, meId)
    const qaSynced = offer
      ? syncOwnQaIntoMessages(mergedMsgs, offer, threadBuyerId, sellerUserId, meId)
      : mergedMsgs
    set((s) => ({
      ...s,
      threads: {
        ...s.threads,
        [threadId]: {
          ...s.threads[threadId]!,
          contracts,
          messages: qaSynced,
          routeSheets: routeSheetsRs.length > 0 ? routeSheetsRs : s.threads[threadId]!.routeSheets ?? [],
        },
      },
    }))
  } catch {
    /* offline */
  }
}

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
  | 'refreshThreadTradeAgreements'
  | 'recordChatExitFromList'
  | 'applyPeerPartyExitedFromServer'
  | 'removeThreadFromList'
  | 'markThreadPaymentCompleted'
> {
  return {
onThreadCreatedFromServer: (dto: ChatThreadDto) => {
  mergeBuyerLabelFromThreadDto(dto)
  const peer = peerPartyExitFromDto(dto)
  set((s) => {
    if (s.threads[dto.id]) return s
    const store = s.stores[dto.storeId]
    if (!store) return s
    const nextThreads: typeof s.threads = { ...s.threads }
    nextThreads[dto.id] = {
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
      ...(peer
        ? {
            peerPartyExit: peer,
            partyExitedUserId: peer.userId,
            partyExitedReason: peer.reason,
            partyExitedAtUtc: peer.atUtc,
          }
        : {}),
    }
    return { ...s, threads: nextThreads }
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
          text: question,
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

  const threadCatalogId =
    (offer as { emergentBaseOfferId?: string }).emergentBaseOfferId?.trim() || offerId

  const viewerBid = (opts?.buyerId ?? '').trim()
  const sameOffer = Object.values(s.threads).filter(
    (t) => t.offerId === threadCatalogId,
  )
  const existing =
    viewerBid.length >= 2
      ? (sameOffer.find(
          (t) => (t.buyerUserId ?? '').trim() === viewerBid,
        ) ?? sameOffer[0])
      : sameOffer[0]
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
      | 'partyExitedUserId'
      | 'partyExitedReason'
      | 'partyExitedAtUtc'
    >,
    contractsOverride?: TradeAgreement[],
    routeSheetsFromServer?: RouteSheetPayload[],
  ) => {
    mergeChatSenderLabelsIntoProfileStore(serverMsgs)
    if (participantDto) mergeBuyerLabelFromThreadDto(participantDto)
    const mapped = serverMsgs.map((d) => mapChatMessageDtoToMessage(d, meId))
    const contractList = contractsOverride ?? baseThread.contracts ?? []
    const validAgreementIds = new Set(contractList.map((c) => c.id))
    const mergedMsgs = mergePersistedChatMessages(mapped, baseThread.messages, {
      validTradeAgreementIds: validAgreementIds,
    })
    const sellerUserId =
      participantDto?.sellerUserId ?? get().stores[offer.storeId]?.ownerUserId
    const threadBuyerId =
      participantDto?.buyerUserId ?? baseThread.buyerUserId ?? buyerId
    const qaSynced = syncOwnQaIntoMessages(
      mergedMsgs,
      offer,
      threadBuyerId,
      sellerUserId,
      meId,
    )
    const peerExit = peerPartyExitFromDto(participantDto ?? undefined)
    const premature =
      peerExit != null && peerExit.userId.trim() !== meId.trim()
    set((x) => {
      const nextThreads = { ...x.threads }
      if (existing && existing.id !== threadId) {
        const keepPriorPersistedThread =
          !!opts?.forceNewThread &&
          existing.id.startsWith("cth_") &&
          threadId.startsWith("cth_");
        if (!keepPriorPersistedThread) {
          delete nextThreads[existing.id]
        }
      }
        nextThreads[threadId] = {
        ...baseThread,
        id: threadId,
        // Evita que un bloqueo local (p. ej. salir de la lista con acuerdo) impida reescribir
        // al reabrir el hilo con datos del servidor.
        chatActionsLocked: false,
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
        ...(peerExit
          ? {
              peerPartyExit: peerExit,
              partyExitedUserId: peerExit.userId,
              partyExitedReason: peerExit.reason,
              partyExitedAtUtc: peerExit.atUtc,
              prematureExitUnderInvestigation: premature,
            }
          : {}),
        messages: qaSynced,
        contracts: contractsOverride ?? baseThread.contracts ?? [],
        routeSheets: routeSheetsFromServer ?? baseThread.routeSheets ?? [],
      }
      return { ...x, threads: nextThreads }
    })
  }

  const loadContractsForPersistedThread = async (
    tid: string,
    fallback: TradeAgreement[] | undefined,
  ): Promise<TradeAgreement[]> => {
    if (!tid.startsWith('cth_') || !getSessionToken()) return fallback ?? []
    try {
      const ag = await fetchThreadTradeAgreements(tid)
      return ag.map(mapTradeAgreementApiToTradeAgreement)
    } catch {
      return fallback ?? []
    }
  }

  if (canPersist) {
    try {
      if (existing?.id.startsWith('cth_') && !opts?.forceNewThread) {
        const serverMsgs = await fetchChatMessages(existing.id)
        const th = get().threads[existing.id]
        if (th) {
          const contracts = await loadContractsForPersistedThread(existing.id, th.contracts)
          const routeSheets =
            getSessionToken()
              ? await fetchThreadRouteSheets(existing.id).catch(() => [] as RouteSheetPayload[])
              : []
          try {
            const dto = await fetchChatThread(existing.id)
            applyHydratedThread(
              existing.id,
              serverMsgs,
              th,
              dto.purchaseMode,
              dto,
              contracts,
              routeSheets,
            )
          } catch {
            applyHydratedThread(
              existing.id,
              serverMsgs,
              th,
              undefined,
              undefined,
              contracts,
              routeSheets,
            )
          }
        }
        return existing.id
      }

      const isSeller = store.ownerUserId === meId
      if (isSeller) {
        const dto = await fetchChatThreadByOffer(threadCatalogId)
        if (!dto) return ''
        const serverMsgs = await fetchChatMessages(dto.id)
        const routeSheets =
          dto.id.startsWith('cth_') && getSessionToken()
            ? await fetchThreadRouteSheets(dto.id).catch(() => [] as RouteSheetPayload[])
            : []
        const bootstrap: Thread = existing
          ? { ...existing, id: dto.id }
          : {
              id: dto.id,
              offerId: threadCatalogId,
              storeId: offer.storeId,
              store,
              purchaseMode: dto.purchaseMode,
              messages: dto.purchaseMode
                ? buildPurchaseThreadSystemOnly(offer)
                : [],
              contracts: [],
              routeSheets: [],
            }
        const contracts = await loadContractsForPersistedThread(dto.id, bootstrap.contracts)
        applyHydratedThread(dto.id, serverMsgs, bootstrap, dto.purchaseMode, dto, contracts, routeSheets)
        return dto.id
      }

      if (!isOfferPublishedForBuyerChat(offer, get().storeCatalogs)) {
        return ''
      }

      const dto = await createOrGetChatThread(threadCatalogId, true, !!opts?.forceNewThread)
      const serverMsgs = await fetchChatMessages(dto.id)
      const routeSheets =
        dto.id.startsWith('cth_') && getSessionToken()
          ? await fetchThreadRouteSheets(dto.id).catch(() => [] as RouteSheetPayload[])
          : []
      const bootstrap: Thread = {
        id: dto.id,
        offerId: threadCatalogId,
        storeId: offer.storeId,
        store,
        purchaseMode: dto.purchaseMode,
        messages: dto.purchaseMode
          ? buildPurchaseThreadSystemOnly(offer)
          : [],
        contracts: existing?.contracts ?? [],
        routeSheets: existing?.routeSheets ?? [],
      }
      const contracts = await loadContractsForPersistedThread(dto.id, bootstrap.contracts)
      applyHydratedThread(dto.id, serverMsgs, bootstrap, dto.purchaseMode, dto, contracts, routeSheets)
      return dto.id
    } catch (e) {
      if (e instanceof Error && e.message === CHAT_CANNOT_MESSAGE_SELF) return ''
      if (opts?.forceNewThread) return ''
      /* fallback local */
    }
  }

  if (existing && !opts?.forceNewThread) {
    const viewerId = useAppStore.getState().me.id
    const threadBuyerId =
      existing.buyerUserId ?? resolveBuyerUserId(existing, viewerId)
    const merged = syncOwnQaIntoMessages(
      existing.messages,
      offer,
      threadBuyerId,
      existing.sellerUserId ?? store?.ownerUserId,
      viewerId,
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

  if (
    buyerId &&
    store?.ownerUserId !== buyerId &&
    !isOfferPublishedForBuyerChat(offer, get().storeCatalogs)
  ) {
    return ''
  }

  const id = uid('th')
  const bootstrap: Thread = {
    id,
    offerId: threadCatalogId,
    storeId: offer.storeId,
    store,
    purchaseMode: true,
    messages: buildPurchaseThreadMessages(
      offer,
      buyerId,
      store?.ownerUserId,
      buyerId,
    ),
    contracts: [],
    routeSheets: [],
  }
  set((x) => ({ ...x, threads: { ...x.threads, [id]: bootstrap } }))
  return id
},

syncThreadBuyerQa: (threadId, viewerId) => {
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const offer = s.offers[th.offerId]
    if (!offer) return s
    const threadBuyerId = th.buyerUserId ?? resolveBuyerUserId(th, viewerId)
    if (!threadBuyerId) return s
    const sellerUserId = th.sellerUserId ?? s.stores[offer.storeId]?.ownerUserId
    const merged = syncOwnQaIntoMessages(
      th.messages,
      offer,
      threadBuyerId,
      sellerUserId,
      viewerId,
    )
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
    const viewerId = useAppStore.getState().me.id
    for (const th of Object.values(st.threads)) {
      if (th.offerId !== offerId) continue
      get().syncThreadBuyerQa(th.id, viewerId)
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

emitTradeAgreement: async (threadId, draft) => {
  if (hasValidationErrors(validateTradeAgreementDraft(draft))) return null
  if (threadIsActionLocked(get().threads[threadId])) return null
  const title = draft.title.trim()
  if (!title) return null
  const th0 = get().threads[threadId]
  if (!th0 || threadIsActionLocked(th0)) return null

  const persist = !!getSessionToken() && threadId.startsWith('cth_')
  if (persist) {
    try {
      const body = {
        title: draft.title,
        includeMerchandise: draft.includeMerchandise,
        includeService: draft.includeService,
        merchandise: draft.merchandise,
        services: draft.services,
      }
      const created = await postThreadTradeAgreement(threadId, body)
      await syncPersistedAgreementsAndMessages(set, get, threadId)
      return created.id
    } catch {
      return null
    }
  }

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

updatePendingTradeAgreement: async (threadId, agreementId, draft) => {
  if (hasValidationErrors(validateTradeAgreementDraft(draft))) return false
  if (threadIsActionLocked(get().threads[threadId])) return false
  const title = draft.title.trim()
  if (!title) return false

  const persist = !!getSessionToken() && threadId.startsWith('cth_')
  if (persist) {
    try {
      const body = {
        title: draft.title,
        includeMerchandise: draft.includeMerchandise,
        includeService: draft.includeService,
        merchandise: draft.merchandise,
        services: draft.services,
      }
      await patchThreadTradeAgreement(threadId, agreementId, body)
      await syncPersistedAgreementsAndMessages(set, get, threadId)
      return true
    } catch {
      return false
    }
  }

  let applied = false
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const list = th.contracts ?? []
    const idx = list.findIndex((c) => c.id === agreementId)
    if (idx < 0) return s
    const ag = list[idx]
    if (ag.status === 'deleted') return s
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

deleteTradeAgreement: async (threadId, agreementId) => {
  const persist = !!getSessionToken() && threadId.startsWith('cth_')
  if (persist) {
    try {
      await deleteThreadTradeAgreement(threadId, agreementId)
      await syncPersistedAgreementsAndMessages(set, get, threadId)
      return true
    } catch {
      return false
    }
  }

  let ok = false
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const list = th.contracts ?? []
    const idx = list.findIndex((c) => c.id === agreementId)
    if (idx < 0) return s
    const ag = list[idx]
    if (ag.status === 'accepted' || ag.status === 'deleted') return s
    if (ag.issuedByStoreId !== th.storeId) return s
    const sheetCount = th.routeSheets?.length ?? 0
    if (sheetCount > list.length - 1) return s
    const title = ag.title
    const now = Date.now()
    const nextContracts = list.map((c) =>
      c.id === agreementId
        ? { ...c, status: 'deleted' as const, deletedAt: now }
        : c,
    )
    const sys: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: `Se eliminó el acuerdo «${title}» del hilo (no aplica a acuerdos ya aceptados).`,
      at: now,
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

respondTradeAgreement: async (threadId, agreementId, response) => {
  const persist = !!getSessionToken() && threadId.startsWith('cth_')
  if (persist) {
    try {
      const updatedDto = await postThreadTradeAgreementRespond(
        threadId,
        agreementId,
        response === 'accept',
      )
      // La respuesta del POST es la fuente de verdad del acuerdo actualizado. Reflejarla ya,
      // porque sync (GET mensajes + acuerdos) puede fallar en red y el catch silencioso
      // dejaba el panel Contratos y las burbujas en estado viejo aun con backend OK.
      const mapped = mapTradeAgreementApiToTradeAgreement(updatedDto)
      set((s) => {
        const t = s.threads[threadId]
        if (!t) return s
        const list = t.contracts ?? []
        const idx = list.findIndex((c) => c.id === mapped.id)
        const nextContracts =
          idx < 0 ? [...list, mapped] : list.map((c, i) => (i === idx ? mapped : c))
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: { ...t, contracts: nextContracts },
          },
        }
      })
      await syncPersistedAgreementsAndMessages(set, get, threadId)
      return true
    } catch {
      return false
    }
  }

  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const list = th.contracts ?? []
    const idx = list.findIndex((c) => c.id === agreementId)
    if (idx < 0) return s
    const ag = list[idx]
    if (ag.status === 'deleted') return s
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
  return true
},

refreshThreadTradeAgreements: async (threadId) => {
  const th = get().threads[threadId]
  if (!th || !threadId.startsWith('cth_')) return
  if (!getSessionToken()) return
  try {
    const [agreements, routeSheetsRs] = await Promise.all([
      fetchThreadTradeAgreements(threadId),
      fetchThreadRouteSheets(threadId).catch(() => [] as RouteSheetPayload[]),
    ])
    const contracts = agreements.map(mapTradeAgreementApiToTradeAgreement)
    set((s) => {
      const t = s.threads[threadId]
      if (!t) return s
      return {
        ...s,
        threads: {
          ...s.threads,
          [threadId]: {
            ...t,
            contracts,
            routeSheets:
              routeSheetsRs.length > 0 ? routeSheetsRs : (t.routeSheets ?? []),
          },
        },
      }
    })
  } catch {
    /* offline */
  }
},

recordChatExitFromList: (threadId, leaverUserId, opts?: { skipTrustAdjust?: boolean }) => {
  const lid = (leaverUserId ?? '').trim()
  const th0 = get().threads[threadId]
  let appliedPenalty = 0
  let groupMemberCount = 0

  if (th0 && lid.length >= 2 && threadHasAcceptedAgreement(th0)) {
    const buyerUid = (resolveBuyerUserId(th0, lid) ?? '').trim()
    const sellerUid = (resolveSellerUserId(th0) ?? '').trim()
    const leaverIsBuyer = buyerUid.length >= 2 && lid === buyerUid
    const leaverIsSeller = sellerUid.length >= 2 && lid === sellerUid
    if (leaverIsBuyer || leaverIsSeller) {
      let n = 0
      if (buyerUid.length >= 2) n++
      if (sellerUid.length >= 2) n++
      n += th0.chatCarriers?.length ?? 0
      groupMemberCount = Math.max(1, n)
      const skipForSecondParty = counterpartyAlreadyRecordedPartyExitFromThread(
        th0,
        lid,
      )
      appliedPenalty = skipForSecondParty
        ? 0
        : CHAT_PARTY_EXIT_TRUST_PER_MEMBER * groupMemberCount
      if (!opts?.skipTrustAdjust) {
        if (leaverIsSeller) {
          const storeId = th0.storeId?.trim()
          if (storeId) {
            get().applyStoreTrustPenalty(
              storeId,
              appliedPenalty,
              'Salida del chat con acuerdo aceptado (demo)',
            )
          }
        } else {
          useAppStore.getState().applyTrustPenalty(
            buyerUid,
            appliedPenalty,
            'Salida del chat con acuerdo aceptado (demo)',
          )
        }
      }
    }
  }

  set((s) => {
    const th = s.threads[threadId]
    if (!th) return s
    const next: Partial<Pick<Thread, 'prematureExitUnderInvestigation' | 'chatActionsLocked'>> = {}
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

  return { appliedPenalty, groupMemberCount }
},

applyPeerPartyExitedFromServer: (threadId, payload) => {
  const tid = (threadId ?? '').trim()
  const uid = (payload.leaverUserId ?? '').trim()
  if (tid.length < 4 || uid.length < 2) return
  const reason = (payload.reason ?? '').trim()
  const atUtc =
    payload.atUtc != null ? String(payload.atUtc) : new Date().toISOString()
  const leaverRole = payload.leaverRole
  set((s) => {
    const th = s.threads[tid]
    if (!th) return s
    const peer = {
      userId: uid,
      reason,
      atUtc,
      ...(leaverRole === 'buyer' || leaverRole === 'seller' ? { leaverRole } : {}),
    }
    return {
      ...s,
      threads: {
        ...s.threads,
        [tid]: {
          ...th,
          peerPartyExit: peer,
          partyExitedUserId: uid,
          partyExitedReason: reason,
          partyExitedAtUtc: atUtc,
          prematureExitUnderInvestigation: true,
        },
      },
    }
  })
},

removeThreadFromList: async (threadId, opts?: { skipServerDelete?: boolean }) => {
  if (threadId.startsWith('cth_')) {
    void disconnectFromChatThread(threadId)
    if (getSessionToken() && !opts?.skipServerDelete) {
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
