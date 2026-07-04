import type { TradeAgreement, TradeAgreementDraft } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import {
  normalizeExtraScope,
  normalizeMerchandiseLine,
} from "@features/chat/logic/agreement/tradeAgreementTypes"
import { hasValidationErrors, validateTradeAgreementDraft } from "@features/chat/logic/agreement/tradeAgreementValidation"
import type { RouteSheetPayload } from "@features/chat/Dtos/route-sheet/routeSheetTypes";import type { ChatMessageDto, ChatThreadDto } from "@features/chat/Dtos/thread/chatApiTypes";
import { CHAT_CANNOT_MESSAGE_SELF, createOrGetChatThread, deleteChatThread, deleteThreadTradeAgreement, fetchChatMessages, fetchChatThread, fetchChatThreadByOffer, fetchThreadRouteSheets, fetchThreadTradeAgreements, patchThreadTradeAgreement, postThreadTradeAgreement, postThreadTradeAgreementDuplicate, postThreadTradeAgreementRespond } from "@features/chat/api/chatApi";import { mapTradeAgreementApiToTradeAgreement } from "@features/chat/logic/agreement/tradeAgreementApiMapper"
import { disconnectFromChatThread } from "@features/chat/logic/realtime/chatRealtime"
import {
  mapChatMessageDtoToMessage,
  mergePersistedChatMessages,
} from "@features/chat/logic/thread/chatMerge"
import {
  mergeBuyerLabelFromThreadDto,
  mergeChatSenderLabelsIntoProfileStore,
} from "@features/chat/logic/participants/chatSenderLabels"
import { getSessionToken } from "@shared/services/http/sessionToken"
import type { MarketState, Message, Thread } from '@features/market/logic/store/marketStoreTypes'
import {
  threadAcceptedAgreementsAllLiquidated,
  threadHasAcceptedAgreement,
  threadHasAcceptedAgreementUnpaid,
} from '@features/market/logic/store/marketStoreTypes'
import {
  buildPurchaseThreadSystemOnly,
  threadIsActionLocked,
  uid,
} from '@features/market/logic/store/marketStoreHelpers'
import { routeSheetHasConfirmedCarriers } from '@features/market/logic/store/marketSliceHelpers'
import type { MarketSliceGet, MarketSliceSet } from '@features/market/logic/store/marketSliceTypes'
import { resolveBuyerUserId, resolveSellerUserId } from "@features/chat/logic/participants/chatParticipantLabels"
import {
  CHAT_PARTY_EXIT_TRUST_PER_MEMBER,
  SELLER_TRUST_PENALTY_ON_EDIT,
} from "@features/chat"
import {
  counterpartyAlreadyRecordedPartyExitFromThread,
  peerPartyExitFromDto,
} from "@features/chat/logic/party-exit/threadPeerPartyExit"
import { partyExpelledFieldsFromDto, markPartyExpelledOnThread } from "@features/chat/logic/party-exit/threadPartyExpelled"
import { isOfferPublishedForBuyerChat } from "@features/market/logic/offerPublishedForBuyerChat"
import { useAppStore } from '@features/auth/logic/useAppStore'
import {
  minimalOfferStoreFromChatThreadDto,
  VT_SOCIAL_PLACEHOLDER_OFFER_ID,
} from "@features/chat/logic/thread/chatThreadDtoFallbacks";

function extraFieldsPayloadForApi(
  draft: TradeAgreementDraft,
):
  | Array<{
      title: string;
      valueKind: "text" | "image" | "document";
      scope: "merchandise" | "service" | "legacy_combined";
      textValue?: string;
      mediaUrl?: string;
      fileName?: string;
    }>
  | undefined {
  const rows = draft.extraFields ?? [];
  const out: Array<{
    title: string;
    valueKind: "text" | "image" | "document";
    scope: "merchandise" | "service" | "legacy_combined";
    textValue?: string;
    mediaUrl?: string;
    fileName?: string;
  }> = [];
  for (const r of rows) {
    const scope = normalizeExtraScope(r.scope as string | undefined);
    if (scope === "merchandise" && !draft.includeMerchandise) continue;
    if (scope === "service" && !draft.includeService) continue;
    if (
      scope === "legacy_combined" &&
      !(draft.includeMerchandise && draft.includeService)
    )
      continue;
    const title = r.title.trim();
    const text = r.textValue.trim();
    const url = r.mediaUrl.trim();
    if (!title.length && !text.length && !url.length) continue;
    if (r.valueKind === "text") {
      out.push({
        title: title.length ? title : "",
        scope,
        valueKind: "text",
        ...(text.length ? { textValue: text } : {}),
      });
    } else {
      const kind =
        r.valueKind === "document"
          ? ("document" as const)
          : ("image" as const);
      out.push({
        title: title.length ? title : "",
        scope,
        valueKind: kind,
        ...(url.length ? { mediaUrl: url } : {}),
        ...(r.fileName.trim().length ? { fileName: r.fileName.trim() } : {}),
      });
    }
  }
  return out.length ? out : undefined;
}

/** Filas locales que siguen aplicando al inclusives actuales (para snapshot offline). */
function snapshotDraftExtraFields(
  draft: TradeAgreementDraft,
): TradeAgreement["extraFields"] {
  const rows = draft.extraFields ?? [];
  const kept = rows.filter((r) => {
    const scope = normalizeExtraScope(r.scope as string | undefined);
    if (scope === "merchandise" && draft.includeMerchandise) return true;
    if (scope === "service" && draft.includeService) return true;
    if (
      scope === "legacy_combined" &&
      draft.includeMerchandise &&
      draft.includeService
    )
      return true;
    return false;
  });
  return kept.length
    ? (JSON.parse(JSON.stringify(kept)) as TradeAgreement["extraFields"])
    : undefined;
}

async function syncPersistedAgreementsAndMessages(
  set: MarketSliceSet,
  get: MarketSliceGet,
  threadId: string,
) {
  const th = get().threads[threadId]
  if (!th || !threadId.startsWith('cth_')) return
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
    set((s) => ({
      ...s,
      threads: {
        ...s.threads,
        [threadId]: {
          ...s.threads[threadId]!,
          contracts,
          messages: mergedMsgs,
          routeSheets: routeSheetsRs.length > 0 ? routeSheetsRs : s.threads[threadId]!.routeSheets ?? [],
        },
      },
    }))
  } catch {
    /* offline */
  }
}

export function createOffersThreadsSlice(set: MarketSliceSet, get: MarketSliceGet): Pick<MarketState,
  | 'ensureThreadForOffer'
  | 'onThreadCreatedFromServer'
  | 'emitTradeAgreement'
  | 'updatePendingTradeAgreement'
  | 'deleteTradeAgreement'
  | 'duplicateTradeAgreement'
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
    let store = s.stores[dto.storeId]
    let offers = s.offers
    let stores = s.stores
    if (!store) {
      const { offer: fo, store: st } = minimalOfferStoreFromChatThreadDto(dto)
      offers = { ...s.offers, [fo.id]: fo }
      stores = { ...s.stores, [st.id]: st }
      store = stores[dto.storeId]
    }
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
      ...(dto.isSocialGroup ||
      dto.offerId?.trim() === VT_SOCIAL_PLACEHOLDER_OFFER_ID
        ? { isSocialGroup: true as const }
        : {}),
      ...(dto.socialGroupTitle !== undefined
        ? {
            socialGroupTitle: dto.socialGroupTitle?.trim()
              ? dto.socialGroupTitle.trim()
              : null,
          }
        : {}),
      ...(peer
        ? {
            peerPartyExit: peer,
            partyExitedUserId: peer.userId,
            partyExitedReason: peer.reason,
            partyExitedAtUtc: peer.atUtc,
          }
        : {}),
      ...partyExpelledFieldsFromDto(dto),
    }
    return { ...s, threads: nextThreads, offers, stores }
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
      | 'offerId'
      | 'buyerUserId'
      | 'sellerUserId'
      | 'buyerDisplayName'
      | 'buyerAvatarUrl'
      | 'partyExitedUserId'
      | 'partyExitedReason'
      | 'partyExitedAtUtc'
      | 'buyerExpelledAtUtc'
      | 'sellerExpelledAtUtc'
      | 'isSocialGroup'
      | 'socialGroupTitle'
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
        ...partyExpelledFieldsFromDto(participantDto ?? undefined),
        ...(participantDto?.isSocialGroup ||
        participantDto?.offerId?.trim() === VT_SOCIAL_PLACEHOLDER_OFFER_ID
          ? { isSocialGroup: true as const }
          : {}),
        ...(participantDto && participantDto.socialGroupTitle !== undefined
          ? {
              socialGroupTitle: participantDto.socialGroupTitle?.trim()
                ? participantDto.socialGroupTitle.trim()
                : null,
            }
          : {}),
        messages: mergedMsgs,
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
    messages: buildPurchaseThreadSystemOnly(offer),
    contracts: [],
    routeSheets: [],
  }
  set((x) => ({ ...x, threads: { ...x.threads, [id]: bootstrap } }))
  return id
},

emitTradeAgreement: async (threadId, draft) => {
  const fail = (message?: string) =>
    ({ ok: false as const, message: message?.trim() || undefined })
  const okOf = (agreementId: string) =>
    ({ ok: true as const, agreementId })
  if (hasValidationErrors(validateTradeAgreementDraft(draft))) {
    return fail('Revisa el acuerdo: hay datos incorrectos.')
  }
  if (threadIsActionLocked(get().threads[threadId])) {
    return fail('Este chat no permite enviar ese cambio.')
  }
  const title = draft.title.trim()
  if (!title) return fail('Indica el título del acuerdo.')
  const th0 = get().threads[threadId]
  if (!th0 || threadIsActionLocked(th0)) {
    return fail('Este chat no permite enviar ese cambio.')
  }

  const persist = !!getSessionToken() && threadId.startsWith('cth_')
  if (persist) {
    try {
      const xfApi = extraFieldsPayloadForApi(draft);
      const body = {
        title: draft.title,
        includeMerchandise: draft.includeMerchandise,
        includeService: draft.includeService,
        merchandise: draft.merchandise,
        services: draft.services,
        ...(xfApi ? { extraFields: xfApi } : {}),
      };
      const created = await postThreadTradeAgreement(threadId, body)
      await syncPersistedAgreementsAndMessages(set, get, threadId)
      return okOf(created.id)
    } catch (e: unknown) {
      const apiMsg =
        e instanceof Error && e.message.trim() ? e.message.trim() : undefined
      return fail(apiMsg || 'No se pudo emitir el acuerdo.')
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
      extraFields: snapshotDraftExtraFields(draft),
      routeSheetId: undefined,
      hadBuyerAcceptance: false,
    }
    const msg: Message = {
      id: uid('m'),
      from: 'me',
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
  return okOf(aid)
},

updatePendingTradeAgreement: async (threadId, agreementId, draft) => {
  const fail = (message?: string) =>
    ({ ok: false as const, message: message?.trim() || undefined })
  if (hasValidationErrors(validateTradeAgreementDraft(draft))) {
    return fail('Revisa el acuerdo: hay datos incorrectos.')
  }
  if (threadIsActionLocked(get().threads[threadId])) {
    return fail('Este chat no permite enviar ese cambio.')
  }
  const title = draft.title.trim()
  if (!title) return fail('Indica el título del acuerdo.')

  const persist = !!getSessionToken() && threadId.startsWith('cth_')
  if (persist) {
    try {
      const xfApi = extraFieldsPayloadForApi(draft);
      const body = {
        title: draft.title,
        includeMerchandise: draft.includeMerchandise,
        includeService: draft.includeService,
        merchandise: draft.merchandise,
        services: draft.services,
        ...(xfApi ? { extraFields: xfApi } : {}),
      };
      await patchThreadTradeAgreement(threadId, agreementId, body)
      await syncPersistedAgreementsAndMessages(set, get, threadId)
      return { ok: true as const }
    } catch (e: unknown) {
      const apiMsg =
        e instanceof Error && e.message.trim() ? e.message.trim() : undefined
      return fail(apiMsg || 'No se pudo guardar el acuerdo.')
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
      extraFields: snapshotDraftExtraFields(draft),
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
  return applied ? { ok: true as const } : fail('No se pudo actualizar el acuerdo.')
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

duplicateTradeAgreement: async (threadId, agreementId) => {
  const persist = !!getSessionToken() && threadId.startsWith('cth_')
  if (persist) {
    try {
      const created = await postThreadTradeAgreementDuplicate(threadId, agreementId)
      const mapped = mapTradeAgreementApiToTradeAgreement(created)
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
      void syncPersistedAgreementsAndMessages(set, get, threadId).catch(() => {})
      return created.id
    } catch {
      return null
    }
  }
  return null
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
      hadBuyerAcceptance:
        response === 'accept' ? true : ag.hadBuyerAcceptance === true,
    }

    const rejectAfterPriorAccept =
      response !== 'accept' && ag.hadBuyerAcceptance === true
    if (rejectAfterPriorAccept) {
      const sid = (th.storeId ?? '').trim()
      if (sid.length >= 2) {
        get().applyStoreTrustPenalty(
          sid,
          SELLER_TRUST_PENALTY_ON_EDIT,
          'Rechazo del comprador tras una aceptación previa del acuerdo (demo)',
        )
      }
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
      const allAgreementsLiquidated = threadAcceptedAgreementsAllLiquidated(th0)
      appliedPenalty =
        skipForSecondParty || allAgreementsLiquidated
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
    const expelled = markPartyExpelledOnThread(th, uid, atUtc, leaverRole)
    return {
      ...s,
      threads: {
        ...s.threads,
        [tid]: {
          ...th,
          ...expelled,
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
