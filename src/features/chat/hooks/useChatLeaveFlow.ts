import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppStore } from '@features/auth/store/useAppStore'
import type { Thread } from '@features/market/model/store/useMarketStore'
import {
  threadAcceptedAgreementsAllLiquidated,
  threadHasAcceptedAgreement,
  useMarketStore,
} from '@features/market/model/store/useMarketStore'
import {
  resolveBuyerUserId,
  resolveSellerUserId,
} from '@features/chat/model/chatParticipantLabels'
import { viewerIsConfirmedRouteCarrierOnThread } from '@features/chat/model/routeSheetOfferGuards'
import { notifyChatParticipantsUserLeft } from '@features/chat/model/chatRealtime'
import {
  fetchChatThread,
  postCarrierWithdrawFromThread,
  postPartySoftLeaveChatThread,
} from '@features/chat/api/chatApi'
import { counterpartyAlreadyRecordedPartyExit } from '@features/chat/model/threadPeerPartyExit'
import { getSessionToken } from '@shared/services/http/sessionToken'
import { errorToUserMessage } from '@shared/services/http/apiErrorMessage'
import { VtHttpError } from '@shared/services/http/VtHttpError'
import { requestEligibleLegRefund } from '@features/chat/api/routeLogisticsApi'
import {
  postMeTrustAdjust,
  postStoreTrustAdjust,
  trustHistoryItemFromApi,
} from '@features/profile/api/trustLedgerApi'
import {
  CARRIER_ROUTE_EXIT_TRUST_PENALTY,
  CHAT_PARTY_EXIT_TRUST_PER_MEMBER,
} from '../components/modals/TrustRiskEditConfirmModal'

export type LeaveRefundSuggestion = {
  threadId: string
  agreementId: string
  routeSheetId: string
  routeStopId: string
}

export function useChatLeaveFlow() {
  const me = useAppStore((s) => s.me)
  const setTrustScore = useAppStore((s) => s.setTrustScore)
  const removeThreadFromList = useMarketStore((s) => s.removeThreadFromList)
  const refreshThreadTradeAgreements = useMarketStore(
    (s) => s.refreshThreadTradeAgreements,
  )
  const unpublishRouteSheetFromPlatform = useMarketStore(
    (s) => s.unpublishRouteSheetFromPlatform,
  )

  const [leaveModalThreadId, setLeaveModalThreadId] = useState<string | null>(
    null,
  )
  const [leaveBlockingCode, setLeaveBlockingCode] = useState<string | null>(
    null,
  )
  const [leaveBlockingMessage, setLeaveBlockingMessage] = useState<
    string | null
  >(null)
  const [leaveRefundSuggestion, setLeaveRefundSuggestion] =
    useState<LeaveRefundSuggestion | null>(null)
  const [leaveRefundBusy, setLeaveRefundBusy] = useState(false)
  const [leaveReasonModalThreadId, setLeaveReasonModalThreadId] = useState<
    string | null
  >(null)
  const [leaveReasonBusy, setLeaveReasonBusy] = useState(false)
  const [leaveReasonError, setLeaveReasonError] = useState<string | null>(null)

  const threadNeedsLeaveReason = useCallback(
    (th: Thread): boolean => {
      const sellerId = resolveSellerUserId(th)
      const inferredBuyer = resolveBuyerUserId(th, me.id)
      const actsAsRouteCarrier = viewerIsConfirmedRouteCarrierOnThread(
        useMarketStore.getState(),
        th,
        me.id,
      )
      const isBuyerOrSeller =
        (sellerId != null && me.id === sellerId) ||
        (inferredBuyer != null &&
          me.id === inferredBuyer &&
          !actsAsRouteCarrier)
      if (isBuyerOrSeller && threadHasAcceptedAgreement(th)) return true
      if (
        !isBuyerOrSeller &&
        th.id.startsWith('cth_') &&
        getSessionToken()
      ) {
        return true
      }
      return false
    },
    [me.id],
  )

  const runExitChatWithReason = useCallback(
    async (
      threadId: string,
      reasonTrim: string,
    ): Promise<boolean | void> => {
      const th = useMarketStore.getState().threads[threadId]
      if (!th) return
      const sellerId = resolveSellerUserId(th)
      const inferredBuyer = resolveBuyerUserId(th, me.id)
      const actsAsRouteCarrier = viewerIsConfirmedRouteCarrierOnThread(
        useMarketStore.getState(),
        th,
        me.id,
      )
      const isBuyerOrSeller =
        (sellerId != null && me.id === sellerId) ||
        (inferredBuyer != null &&
          me.id === inferredBuyer &&
          !actsAsRouteCarrier)

      let withdrewAsCarrier = false
      let notifiedParticipantsBeforeCarrierWithdraw = false
      if (!isBuyerOrSeller && threadId.startsWith('cth_') && getSessionToken()) {
        if (!reasonTrim) {
          setLeaveReasonError('El motivo es obligatorio.')
          return false
        }
        await notifyChatParticipantsUserLeft(threadId)
        notifiedParticipantsBeforeCarrierWithdraw = true
        try {
          const r = await postCarrierWithdrawFromThread(threadId, reasonTrim)
          if (r.withdrawnRowCount > 0) {
            withdrewAsCarrier = true
            if (r.applyTrustPenalty) {
              const nextTrust =
                typeof r.trustScoreAfterPenalty === 'number'
                  ? r.trustScoreAfterPenalty
                  : Math.max(
                      -10_000,
                      me.trustScore - CARRIER_ROUTE_EXIT_TRUST_PENALTY,
                    )
              setTrustScore(nextTrust)
              toast(
                `Tu barra de confianza se ajustó en −${CARRIER_ROUTE_EXIT_TRUST_PENALTY} por salir del chat como transportista con tramos confirmados (demo).`,
                { icon: '⚠️' },
              )
            } else {
              toast.success(
                'Te des-suscribiste de los tramos. El chat sigue para comprador y vendedor.',
              )
            }
          }
        } catch (e) {
          if (e instanceof VtHttpError) {
            toast.error(e.message)
          } else {
            toast.error(
              errorToUserMessage(
                e,
                'No se pudo registrar la salida como transportista.',
              ),
            )
          }
          return
        }
      }

      const hadAccepted = threadHasAcceptedAgreement(th)
      if (isBuyerOrSeller) {
        if (hadAccepted) {
          if (!reasonTrim) {
            setLeaveReasonError('El motivo es obligatorio.')
            return false
          }
          const imSeller = sellerId != null && me.id === sellerId
          for (const rs of th.routeSheets ?? []) {
            if (rs.publicadaPlataforma) {
              unpublishRouteSheetFromPlatform(threadId, rs.id)
            }
          }
          let partyExitedFromServer = (th.partyExitedUserId ?? '').trim()
          try {
            const dto = await fetchChatThread(threadId)
            if (dto.partyExitedUserId?.trim())
              partyExitedFromServer = dto.partyExitedUserId.trim()
          } catch {
            /* estado local o sin red */
          }
          try {
            await refreshThreadTradeAgreements(threadId)
          } catch {
            /* sin red */
          }
          const thForPenalty = useMarketStore.getState().threads[threadId] ?? th
          const skipPartyExitTrustPenalty = counterpartyAlreadyRecordedPartyExit(
            partyExitedFromServer,
            me.id,
          )
          const allAgreementsLiquidated =
            threadAcceptedAgreementsAllLiquidated(thForPenalty)
          let groupMemberCount = 0
          const buyerUidForCount = (
            th.buyerUserId ??
            th.demoBuyer?.id ??
            inferredBuyer ??
            ''
          ).trim()
          if (buyerUidForCount.length >= 2) groupMemberCount++
          if (sellerId && sellerId.trim().length >= 2) groupMemberCount++
          groupMemberCount += th.chatCarriers?.length ?? 0
          groupMemberCount = Math.max(1, groupMemberCount)
          const appliedPenalty =
            skipPartyExitTrustPenalty || allAgreementsLiquidated
              ? 0
              : CHAT_PARTY_EXIT_TRUST_PER_MEMBER * groupMemberCount
          const exitReasonDetail = `Salida con acuerdo aceptado: ${reasonTrim}`
          let skipClientTrustPenalty = false
          try {
            const leaveRes = await postPartySoftLeaveChatThread(
              threadId,
              reasonTrim,
            )
            skipClientTrustPenalty = leaveRes.skipClientTrustPenalty
            setLeaveBlockingCode(null)
            setLeaveBlockingMessage(null)
            setLeaveRefundSuggestion(null)
          } catch (e) {
            if (e instanceof VtHttpError && e.code === 'not_eligible_party') {
              if (threadId.startsWith('cth_') && getSessionToken()) {
                try {
                  await notifyChatParticipantsUserLeft(threadId)
                  const r = await postCarrierWithdrawFromThread(
                    threadId,
                    reasonTrim,
                  )
                  if (r.withdrawnRowCount > 0) {
                    if (r.applyTrustPenalty) {
                      const nextTrust =
                        typeof r.trustScoreAfterPenalty === 'number'
                          ? r.trustScoreAfterPenalty
                          : Math.max(
                              -10_000,
                              me.trustScore - CARRIER_ROUTE_EXIT_TRUST_PENALTY,
                            )
                      setTrustScore(nextTrust)
                      toast(
                        `Tu barra de confianza se ajustó en −${CARRIER_ROUTE_EXIT_TRUST_PENALTY} por salir del chat como transportista con tramos confirmados (demo).`,
                        { icon: '⚠️' },
                      )
                    } else {
                      toast.success(
                        'Salida registrada como transportista (des-suscripción de tramos).',
                      )
                    }
                    setLeaveBlockingCode(null)
                    setLeaveBlockingMessage(null)
                    setLeaveRefundSuggestion(null)
                    await removeThreadFromList(threadId, {
                      skipServerDelete: true,
                    })
                    return
                  }
                } catch {
                  /* seguir con mensaje del servidor */
                }
              }
              toast.error(e.message)
              return
            }
            if (e instanceof VtHttpError && e.code) {
              setLeaveBlockingCode(e.code)
              setLeaveBlockingMessage(e.message)
              setLeaveReasonModalThreadId(null)
              setLeaveModalThreadId(threadId)
              if (
                e.code === 'route_delivery_active_buyer' ||
                e.code === 'route_delivery_active_seller'
              ) {
                const sheets = th.routeSheets ?? []
                const contracts = th.contracts ?? []
                const accepted = contracts.filter((c) => c.status === 'accepted')
                outer: for (const a of accepted) {
                  const rsid = (a.routeSheetId ?? '').trim()
                  if (rsid.length < 2) continue
                  const sheet = sheets.find((s) => s.id === rsid)
                  const stopId = sheet?.paradas?.[0]?.id?.trim() ?? ''
                  if (stopId.length > 2) {
                    setLeaveRefundSuggestion({
                      threadId,
                      agreementId: a.id,
                      routeSheetId: rsid,
                      routeStopId: stopId,
                    })
                    break outer
                  }
                }
              }
              toast.error(e.message)
              return
            }
            toast.error(
              errorToUserMessage(
                e,
                'No se pudo registrar la salida en el servidor.',
              ),
            )
            return
          }
          const token = getSessionToken()
          if (token && appliedPenalty > 0 && !skipClientTrustPenalty) {
            try {
              if (imSeller && th.storeId?.trim()) {
                const sid = th.storeId.trim()
                const r = await postStoreTrustAdjust(
                  sid,
                  -appliedPenalty,
                  exitReasonDetail,
                )
                useMarketStore.setState((s) => {
                  const score = r.trustScore
                  const nextThreads = { ...s.threads }
                  for (const tid of Object.keys(nextThreads)) {
                    const t = nextThreads[tid]
                    if (t.storeId === sid) {
                      nextThreads[tid] = {
                        ...t,
                        store: { ...t.store, trustScore: score },
                      }
                    }
                  }
                  const b = s.stores[sid]
                  if (!b) return { ...s, threads: nextThreads }
                  return {
                    ...s,
                    stores: { ...s.stores, [sid]: { ...b, trustScore: score } },
                    threads: nextThreads,
                  }
                })
                useAppStore
                  .getState()
                  .prependStoreTrustHistory(
                    sid,
                    trustHistoryItemFromApi(r.entry),
                  )
              } else {
                const r = await postMeTrustAdjust(
                  -appliedPenalty,
                  exitReasonDetail,
                )
                useAppStore.setState((s) => ({
                  me: { ...s.me, trustScore: r.trustScore },
                  profileTrustScores: {
                    ...s.profileTrustScores,
                    [me.id]: r.trustScore,
                  },
                  lastThresholdState:
                    r.trustScore < s.trustThreshold ? 'below' : 'above',
                }))
                useAppStore
                  .getState()
                  .prependUserTrustHistory(
                    me.id,
                    trustHistoryItemFromApi(r.entry),
                  )
              }
            } catch {
              const sid = th.storeId?.trim()
              if (imSeller && sid) {
                useMarketStore
                  .getState()
                  .applyStoreTrustPenalty(sid, appliedPenalty, exitReasonDetail, {
                    forceLocal: true,
                  })
              } else {
                useAppStore
                  .getState()
                  .applyTrustPenalty(me.id, appliedPenalty, exitReasonDetail, {
                    forceLocal: true,
                  })
              }
            }
          }
          if (appliedPenalty > 0) {
            const scope = imSeller
              ? 'La confianza de tu tienda'
              : 'Tu barra de confianza'
            toast(
              `${scope} se ajustó en −${appliedPenalty} por salir con acuerdo aceptado (${groupMemberCount} integrantes × ${CHAT_PARTY_EXIT_TRUST_PER_MEMBER}). Las hojas publicadas se retiraron del mercado. Saliendo, dejaste de formar parte de este hilo: no lo verás en la lista y no podrás reabrirlo.`,
              { icon: '⚠️' },
            )
          } else if (skipPartyExitTrustPenalty || allAgreementsLiquidated) {
            toast.success(
              skipPartyExitTrustPenalty
                ? 'La otra parte ya había salido del chat con acuerdo: no aplica un ajuste extra a tu confianza. Las hojas publicadas se retiraron. Saliendo, dejaste de formar parte de este hilo: no lo verás en la lista y no podrás reabrirlo.'
                : 'Todos los acuerdos aceptados figuran con cobros liquidados: no aplica ajuste a tu confianza. Las hojas publicadas se retiraron. Saliendo, dejaste de formar parte de este hilo: no lo verás en la lista y no podrás reabrirlo.',
            )
          } else {
            toast(
              'Salida registrada. Las hojas publicadas se retiraron del mercado. Podría revisarse. Saliendo, dejaste de formar parte de este hilo: no lo verás en la lista y no podrás reabrirlo.',
              { icon: '⚠️' },
            )
          }
        } else {
          toast.success(
            'Saliste de este hilo. Sin acuerdo aceptado, sin impacto en tu confianza.',
          )
        }
      } else if (!withdrewAsCarrier) {
        toast.success('Conversación quitada de tu lista.')
      }

      const shouldNotifyOthersLeft =
        threadId.startsWith('cth_') &&
        !notifiedParticipantsBeforeCarrierWithdraw &&
        !(isBuyerOrSeller && hadAccepted)
      if (shouldNotifyOthersLeft) {
        await notifyChatParticipantsUserLeft(threadId)
      }
      const skipServerDelete =
        !isBuyerOrSeller || (isBuyerOrSeller && hadAccepted)
      await removeThreadFromList(threadId, { skipServerDelete })
    },
    [
      me.id,
      me.trustScore,
      removeThreadFromList,
      refreshThreadTradeAgreements,
      setTrustScore,
      unpublishRouteSheetFromPlatform,
    ],
  )

  const closeLeaveModal = useCallback(() => {
    setLeaveModalThreadId(null)
    setLeaveBlockingCode(null)
    setLeaveBlockingMessage(null)
    setLeaveRefundSuggestion(null)
    setLeaveRefundBusy(false)
  }, [])

  const closeLeaveReasonModal = useCallback(() => {
    setLeaveReasonModalThreadId(null)
    setLeaveReasonError(null)
    setLeaveReasonBusy(false)
  }, [])

  const handleLeaveConfirm = useCallback(async () => {
    const id = leaveModalThreadId
    if (!id) return false
    let th = useMarketStore.getState().threads[id]
    if (!th) return false
    if (
      !threadHasAcceptedAgreement(th) &&
      id.startsWith('cth_') &&
      getSessionToken()
    ) {
      try {
        await refreshThreadTradeAgreements(id)
        th = useMarketStore.getState().threads[id] ?? th
      } catch {
        /* sin red */
      }
    }
    if (threadNeedsLeaveReason(th)) {
      setLeaveReasonModalThreadId(id)
      setLeaveModalThreadId(null)
      setLeaveReasonError(null)
      return
    }
    await runExitChatWithReason(id, '')
  }, [
    leaveModalThreadId,
    refreshThreadTradeAgreements,
    runExitChatWithReason,
    threadNeedsLeaveReason,
  ])

  const handleLeaveReasonConfirm = useCallback(
    async (reason: string) => {
      const id = leaveReasonModalThreadId
      if (!id) return false
      setLeaveReasonBusy(true)
      setLeaveReasonError(null)
      try {
        const r = await runExitChatWithReason(id, reason)
        if (r === false) return false
        setLeaveReasonModalThreadId(null)
      } finally {
        setLeaveReasonBusy(false)
      }
    },
    [leaveReasonModalThreadId, runExitChatWithReason],
  )

  const handleRequestRefund = useCallback(async () => {
    const r = leaveRefundSuggestion
    if (!r || !getSessionToken()) return
    try {
      setLeaveRefundBusy(true)
      await requestEligibleLegRefund(r)
      toast.success('Reembolso solicitado (si el tramo era elegible).')
    } catch (e) {
      toast.error(errorToUserMessage(e, 'No se pudo solicitar el reembolso.'))
    } finally {
      setLeaveRefundBusy(false)
    }
  }, [leaveRefundSuggestion])

  return {
    leaveModalThreadId,
    leaveBlockingCode,
    leaveBlockingMessage,
    leaveRefundSuggestion,
    leaveRefundBusy,
    leaveReasonModalThreadId,
    leaveReasonBusy,
    leaveReasonError,
    openLeaveModal: setLeaveModalThreadId,
    closeLeaveModal,
    closeLeaveReasonModal,
    handleLeaveConfirm,
    handleLeaveReasonConfirm,
    handleRequestRefund,
  }
}
