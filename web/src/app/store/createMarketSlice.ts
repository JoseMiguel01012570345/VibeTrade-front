import type { StateCreator } from 'zustand'
import type { TradeAgreement } from '../../pages/chat/domain/tradeAgreementTypes'
import { normalizeMerchandiseLine } from '../../pages/chat/domain/tradeAgreementTypes'
import { hasValidationErrors, validateTradeAgreementDraft } from '../../pages/chat/domain/tradeAgreementValidation'
import {
  getRouteSheetFormErrors,
  hasRouteSheetFormErrors,
  normalizeRouteSheetParadas,
} from '../../pages/chat/domain/routeSheetValidation'
import type { RouteSheet, RouteStop } from '../../pages/chat/domain/routeSheetTypes'
import type { StoreCatalog, StoreProduct, StoreService } from '../../pages/chat/domain/storeCatalogTypes'
import type {
  MarketState,
  Message,
  Offer,
  RouteOfferPublicState,
  RouteOfferTramoPublic,
  StoreBadge,
  Thread,
} from './marketStoreTypes'
import {
  threadHasAcceptedAgreement,
  threadHasAcceptedAgreementUnpaid,
} from './marketStoreTypes'
import {
  buildPurchaseThreadMessages,
  collectReplyQuotes,
  routeSheetIdsLinkedToContracts,
  stripLegacyRouteSheetHead,
  syncOwnQaIntoMessages,
  threadIsActionLocked,
  uid,
} from './marketStoreHelpers'
function isOwnerOfStore(stores: Record<string, StoreBadge>, storeId: string, ownerUserId: string): boolean {
  const b = stores[storeId]
  return !!b?.ownerUserId && b.ownerUserId === ownerUserId
}

/** Tras editar la hoja en el hilo, mantiene asignaciones de transportistas en la oferta pública del feed. */
function routeOfferPublicAfterSheetEdit(
  prev: Record<string, RouteOfferPublicState>,
  threadId: string,
  routeSheetId: string,
  sheet: RouteSheet,
): Record<string, RouteOfferPublicState> {
  let next = prev
  let touched = false
  for (const oid of Object.keys(prev)) {
    const ro = prev[oid]
    if (ro.threadId !== threadId || ro.routeSheetId !== routeSheetId) continue
    const assignByStop = new Map(ro.tramos.map((t) => [t.stopId, t.assignment]))
    const tramos: RouteOfferTramoPublic[] = sheet.paradas.map((p) => ({
      stopId: p.id,
      orden: p.orden,
      origenLine: p.origen,
      destinoLine: p.destino,
      cargaEnTramo: p.cargaEnTramo,
      tipoMercanciaCarga: p.tipoMercanciaCarga,
      tipoMercanciaDescarga: p.tipoMercanciaDescarga,
      tipoVehiculoRequerido: p.tipoVehiculoRequerido,
      tiempoRecogidaEstimado: p.tiempoRecogidaEstimado,
      tiempoEntregaEstimado: p.tiempoEntregaEstimado,
      precioTransportista: p.precioTransportista,
      notas: p.notas,
      requisitosEspeciales: p.requisitosEspeciales,
      telefonoTransportista: p.telefonoTransportista?.trim() || undefined,
      assignment: assignByStop.get(p.id),
    }))
    if (!touched) {
      next = { ...prev }
      touched = true
    }
    next[oid] = {
      ...ro,
      routeTitle: sheet.titulo,
      mercanciasResumen: sheet.mercanciasResumen,
      notasGenerales: sheet.notasGenerales,
      hojaEstado: sheet.estado,
      tramos,
    }
  }
  return next
}

function routeOfferTramosAllConfirmed(ro: RouteOfferPublicState | undefined): boolean {
  if (!ro?.tramos?.length) return false
  return ro.tramos.every((t) => t.assignment?.status === 'confirmed')
}

/** Bloquea borrar la hoja si algún tramo tiene transportista ya aceptado (confirmado). Las suscripciones solo pendientes no impiden eliminar. */
function routeSheetHasPendingCarrierAck(th: Thread, routeSheetId: string): boolean {
  const ack = th.routeSheetEditAcks?.[routeSheetId]
  if (!ack) return false
  return Object.values(ack.byCarrier).some((v) => v === 'pending')
}

function routeSheetHasConfirmedCarriers(
  routeOfferPublic: Record<string, RouteOfferPublicState>,
  th: Thread,
  routeSheetId: string,
): boolean {
  const ro = routeOfferPublic[th.offerId]
  if (!ro || ro.routeSheetId !== routeSheetId) return false
  return ro.tramos.some((t) => t.assignment?.status === 'confirmed')
}

/** Huella del tramo para saber si un transportista debe volver a acusar la hoja. */
function routeStopAckFingerprint(p: RouteStop): string {
  return JSON.stringify({
    orden: p.orden,
    origen: (p.origen ?? '').trim(),
    destino: (p.destino ?? '').trim(),
    olat: (p.origenLat ?? '').trim(),
    olng: (p.origenLng ?? '').trim(),
    dlat: (p.destinoLat ?? '').trim(),
    dlng: (p.destinoLng ?? '').trim(),
    t1: (p.tiempoRecogidaEstimado ?? '').trim(),
    t2: (p.tiempoEntregaEstimado ?? '').trim(),
    pr: (p.precioTransportista ?? '').trim(),
    tel: (p.telefonoTransportista ?? '').trim(),
    cg: (p.cargaEnTramo ?? '').trim(),
    tmc: (p.tipoMercanciaCarga ?? '').trim(),
    tmd: (p.tipoMercanciaDescarga ?? '').trim(),
    no: (p.notas ?? '').trim(),
    re: (p.responsabilidadEmbalaje ?? '').trim(),
    rq: (p.requisitosEspeciales ?? '').trim(),
    ve: (p.tipoVehiculoRequerido ?? '').trim(),
  })
}

/** Transportistas con asignación confirmada cuyo tramo (mismo stopId) cambió o desapareció de la hoja. */
function carrierUserIdsAffectedByRouteSheetParadas(
  ro: RouteOfferPublicState | undefined,
  routeSheetId: string,
  existingSheet: RouteSheet,
  newParadas: RouteStop[],
): Set<string> {
  const affected = new Set<string>()
  if (!ro || ro.routeSheetId !== routeSheetId) return affected

  const oldById = new Map(existingSheet.paradas.map((p) => [p.id, p]))
  const newById = new Map(newParadas.map((p) => [p.id, p]))

  for (const t of ro.tramos) {
    const a = t.assignment
    if (!a || a.status !== 'confirmed') continue
    const oldP = oldById.get(t.stopId)
    const newP = newById.get(t.stopId)
    if (!oldP || !newP) {
      affected.add(a.userId)
      continue
    }
    if (routeStopAckFingerprint(oldP) !== routeStopAckFingerprint(newP)) {
      affected.add(a.userId)
    }
  }
  return affected
}

/** userIds con al menos un tramo confirmado en esta oferta (misma hoja). */
function confirmedCarrierIdsOnOffer(ro: RouteOfferPublicState | undefined, routeSheetId: string): Set<string> {
  const ids = new Set<string>()
  if (!ro || ro.routeSheetId !== routeSheetId) return ids
  for (const t of ro.tramos) {
    const a = t.assignment
    if (a?.status === 'confirmed') ids.add(a.userId)
  }
  return ids
}

export const createMarketSlice: StateCreator<MarketState> = (set, get) => ({
    stores: {},
    offers: {},
    offerIds: [],
    storeCatalogs: {},
    threads: {},
    routeOfferPublic: {},

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

    subscribeRouteOfferTramo: (offerId, stopId, carrier, vehicleLabel) => {
      let ok = false
      set((s) => {
        const ro = s.routeOfferPublic[offerId]
        if (!ro) return s
        const ti = ro.tramos.findIndex((t) => t.stopId === stopId)
        if (ti < 0) return s
        const tr = ro.tramos[ti]
        if (tr.assignment?.status === 'confirmed' || tr.assignment?.status === 'pending') return s
        const nextTramos = ro.tramos.map((t, i) =>
          i === ti ?
            {
              ...t,
              assignment: {
                status: 'pending' as const,
                userId: carrier.userId,
                displayName: carrier.displayName,
                phone: carrier.phone,
                trustScore: carrier.trustScore,
                ...(vehicleLabel?.trim() ? { vehicleLabel: vehicleLabel.trim() } : {}),
              },
            }
          : t,
        )
        const th = s.threads[ro.threadId]
        const sys: Message = {
          id: uid('m'),
          from: 'system',
          type: 'text',
          text: `${carrier.displayName} solicitó el tramo ${tr.orden} (${tr.origenLine} → ${tr.destinoLine}). Pendiente de validación del vendedor o comprador.`,
          at: Date.now(),
        }
        ok = true
        return {
          ...s,
          routeOfferPublic: { ...s.routeOfferPublic, [offerId]: { ...ro, tramos: nextTramos } },
          threads:
            th ?
              { ...s.threads, [ro.threadId]: { ...th, messages: [...th.messages, sys] } }
            : s.threads,
        }
      })
      return ok
    },

    validateRouteOfferTramo: (offerId, stopId, accept) => {
      let ok = false
      set((s) => {
        const ro = s.routeOfferPublic[offerId]
        if (!ro) return s
        const ti = ro.tramos.findIndex((t) => t.stopId === stopId)
        if (ti < 0) return s
        const tr = ro.tramos[ti]
        const asg = tr.assignment
        if (!asg || asg.status !== 'pending') return s
        const nextTramos = ro.tramos.map((t, i) => {
          if (i !== ti) return t
          if (!accept) return { ...t, assignment: undefined }
          return { ...t, assignment: { ...asg, status: 'confirmed' as const } }
        })
        const th0 = s.threads[ro.threadId]
        let threads = s.threads
        if (accept && th0?.routeSheets) {
          const rsI = th0.routeSheets.findIndex((r) => r.id === ro.routeSheetId)
          if (rsI >= 0) {
            const rs = th0.routeSheets[rsI]
            const paradas = rs.paradas.map((p) =>
              p.id === stopId ? { ...p, telefonoTransportista: asg.phone } : p,
            )
            const newRs = { ...rs, paradas, actualizadoEn: Date.now() }
            const routeSheets = [...th0.routeSheets]
            routeSheets[rsI] = newRs
            let chatCarriers = [...(th0.chatCarriers ?? [])]
            const hadCarrier = chatCarriers.some((c) => c.id === asg.userId)
            const tramoDesc = `Tramo ${tr.orden} (${tr.origenLine} → ${tr.destinoLine})`
            if (!hadCarrier) {
              chatCarriers.push({
                id: asg.userId,
                name: asg.displayName,
                phone: asg.phone,
                trustScore: asg.trustScore,
                vehicleLabel: asg.vehicleLabel?.trim() || 'No indicada en la suscripción',
                tramoLabel: tramoDesc,
              })
            } else {
              chatCarriers = chatCarriers.map((c) =>
                c.id !== asg.userId ? c
                : c.tramoLabel.includes(`Tramo ${tr.orden} (`) ? c
                : { ...c, tramoLabel: `${c.tramoLabel} · ${tramoDesc}` },
              )
            }
            let routeSheetEditAcksOut = th0.routeSheetEditAcks
            const sheetId = ro.routeSheetId
            const prevAck = sheetId ? th0.routeSheetEditAcks?.[sheetId] : undefined
            const prevByCarrier = { ...(prevAck?.byCarrier ?? {}) }
            const hadOtherConfirmedTramo = ro.tramos.some(
              (t) =>
                t.stopId !== stopId &&
                t.assignment?.userId === asg.userId &&
                t.assignment?.status === 'confirmed',
            )
            if (sheetId && hadOtherConfirmedTramo) {
              for (const t of ro.tramos) {
                const u = t.assignment?.userId
                if (t.assignment?.status === 'confirmed' && u && prevByCarrier[u] === undefined) {
                  prevByCarrier[u] = 'accepted'
                }
              }
              prevByCarrier[asg.userId] = 'pending'
              routeSheetEditAcksOut = {
                ...(th0.routeSheetEditAcks ?? {}),
                [sheetId]: {
                  revision: (prevAck?.revision ?? 0) + 1,
                  byCarrier: prevByCarrier,
                },
              }
            } else if (sheetId && !hadCarrier && prevAck && prevByCarrier[asg.userId] === undefined) {
              routeSheetEditAcksOut = {
                ...(th0.routeSheetEditAcks ?? {}),
                [sheetId]: {
                  ...prevAck,
                  byCarrier: { ...prevByCarrier, [asg.userId]: 'pending' },
                },
              }
            }
            const sysOk: Message = {
              id: uid('m'),
              from: 'system',
              type: 'text',
              text:
                hadOtherConfirmedTramo ?
                  `Suscripción validada: ${asg.displayName} queda asignado al tramo ${tr.orden}. Al incorporar otro tramo, debe aceptar o rechazar la hoja de ruta en la pestaña Rutas (demo). Se le notifica también en la interfaz.`
                : `Suscripción validada: ${asg.displayName} queda asignado al tramo ${tr.orden}. Notificación al transportista: revisar la hoja en el chat (pestaña Rutas).`,
              at: Date.now(),
            }
            threads = {
              ...s.threads,
              [ro.threadId]: {
                ...th0,
                routeSheets,
                chatCarriers,
                ...(routeSheetEditAcksOut !== th0.routeSheetEditAcks ?
                  { routeSheetEditAcks: routeSheetEditAcksOut }
                : {}),
                messages: [...th0.messages, sysOk],
              },
            }
          }
        } else if (!accept && th0) {
          const sysNo: Message = {
            id: uid('m'),
            from: 'system',
            type: 'text',
            text: `Suscripción rechazada para el tramo ${tr.orden} (${asg.displayName}). El tramo vuelve a estar libre.`,
            at: Date.now(),
          }
          threads = {
            ...s.threads,
            [ro.threadId]: { ...th0, messages: [...th0.messages, sysNo] },
          }
        }
        ok = true
        return {
          ...s,
          routeOfferPublic: { ...s.routeOfferPublic, [offerId]: { ...ro, tramos: nextTramos } },
          threads,
        }
      })
      return ok
    },

    respondRouteSheetEdit: (threadId, routeSheetId, carrierUserId, accept) => {
      let ok = false
      set((s) => {
        const th = s.threads[threadId]
        if (!th?.routeSheets || threadIsActionLocked(th)) return s
        const ack = th.routeSheetEditAcks?.[routeSheetId]
        if (!ack || ack.byCarrier[carrierUserId] !== 'pending') return s
        if (!th.chatCarriers?.some((c) => c.id === carrierUserId)) return s
        const carrier = th.chatCarriers.find((c) => c.id === carrierUserId)
        if (!carrier) return s
        const sheet = th.routeSheets.find((r) => r.id === routeSheetId)
        if (!sheet) return s
        const nextByCarrier = {
          ...ack.byCarrier,
          [carrierUserId]: accept ? ('accepted' as const) : ('rejected' as const),
        }
        const now = Date.now()
        const nextAcks = {
          ...(th.routeSheetEditAcks ?? {}),
          [routeSheetId]: { ...ack, byCarrier: nextByCarrier },
        }

        if (accept) {
          const sys: Message = {
            id: uid('m'),
            from: 'system',
            type: 'text',
            text: `${carrier.name} aceptó los cambios en la hoja de ruta «${sheet.titulo}».`,
            at: now,
          }
          ok = true
          return {
            ...s,
            threads: {
              ...s.threads,
              [threadId]: {
                ...th,
                routeSheetEditAcks: nextAcks,
                messages: [...th.messages, sys],
              },
            },
          }
        }

        const ro0 = s.routeOfferPublic[th.offerId]
        const stopIdsToClear = new Set<string>()
        let routeOfferPublic = s.routeOfferPublic
        if (ro0 && ro0.routeSheetId === routeSheetId) {
          for (const t of ro0.tramos) {
            if (t.assignment?.userId === carrierUserId) stopIdsToClear.add(t.stopId)
          }
          const nextTramos = ro0.tramos.map((t) =>
            t.assignment?.userId === carrierUserId ? { ...t, assignment: undefined } : t,
          )
          routeOfferPublic = { ...s.routeOfferPublic, [th.offerId]: { ...ro0, tramos: nextTramos } }
        }
        const paradas = sheet.paradas.map((p) =>
          stopIdsToClear.has(p.id) ? { ...p, telefonoTransportista: undefined } : p,
        )
        const updatedSheet: RouteSheet = { ...sheet, paradas, actualizadoEn: now }
        const rsIdx = th.routeSheets.findIndex((r) => r.id === routeSheetId)
        const routeSheets = [...th.routeSheets]
        routeSheets[rsIdx] = updatedSheet
        routeOfferPublic = routeOfferPublicAfterSheetEdit(
          routeOfferPublic,
          threadId,
          routeSheetId,
          updatedSheet,
        )
        const nextChatCarriers = (th.chatCarriers ?? []).map((c) =>
          c.id !== carrierUserId ?
            c
          : {
              ...c,
              tramoLabel:
                'Integrante del hilo — sin tramo asignado en la oferta tras rechazar la edición de la hoja (demo)',
            },
        )
        const sys: Message = {
          id: uid('m'),
          from: 'system',
          type: 'text',
          text: `${carrier.name} rechazó los cambios en «${sheet.titulo}». Sus tramos quedan libres en la oferta pública; permanece en el chat como integrante (demo).`,
          at: now,
        }
        ok = true
        return {
          ...s,
          routeOfferPublic,
          threads: {
            ...s.threads,
            [threadId]: {
              ...th,
              routeSheets,
              chatCarriers: nextChatCarriers,
              routeSheetEditAcks: nextAcks,
              messages: [...th.messages, sys],
            },
          },
        }
      })
      return ok
    },

    createRouteSheet: (threadId, payload) => {
      const th0 = get().threads[threadId]
      if (threadIsActionLocked(th0)) return null
      if (!th0 || !threadHasAcceptedAgreement(th0)) return null
      const nContracts = th0.contracts?.length ?? 0
      const nSheets = th0.routeSheets?.length ?? 0
      if (nSheets >= nContracts) return null
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
          responsabilidadEmbalaje: p.responsabilidadEmbalaje?.trim() || undefined,
          requisitosEspeciales: p.requisitosEspeciales?.trim() || undefined,
          tipoVehiculoRequerido: p.tipoVehiculoRequerido?.trim() || undefined,
          telefonoTransportista: p.telefonoTransportista?.trim() || undefined,
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
        publicadaPlataforma: false,
        editadaEnFormulario: false,
      }
      set((s) => {
        const th = s.threads[threadId]
        if (!th || threadIsActionLocked(th)) return s
        const nc = th.contracts?.length ?? 0
        const ns = th.routeSheets?.length ?? 0
        if (ns >= nc) return s
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
      const thGuard = get().threads[threadId]
      if (threadIsActionLocked(thGuard)) return false
      if (thGuard && routeSheetHasPendingCarrierAck(thGuard, routeSheetId)) return false
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
          responsabilidadEmbalaje: p.responsabilidadEmbalaje?.trim() || undefined,
          requisitosEspeciales: p.requisitosEspeciales?.trim() || undefined,
          tipoVehiculoRequerido: p.tipoVehiculoRequerido?.trim() || undefined,
          telefonoTransportista: p.telefonoTransportista?.trim() || undefined,
          completada: false as boolean | undefined,
        }))
      let ok = false
      set((s) => {
        const th = s.threads[threadId]
        if (!th?.routeSheets || threadIsActionLocked(th)) return s
        const idx = th.routeSheets.findIndex((rs) => rs.id === routeSheetId)
        if (idx < 0) return s
        const existing = th.routeSheets[idx]
        const paradas: RouteStop[] = built.map((p, i) => ({
          ...p,
          id: existing.paradas[i]?.id ?? p.id,
          completada: existing.paradas[i]?.completada ?? false,
        }))
        const now = Date.now()
        const sheet: RouteSheet = {
          ...stripLegacyRouteSheetHead(existing),
          titulo,
          mercanciasResumen: merc,
          paradas,
          notasGenerales: payload.notasGenerales?.trim() || undefined,
          actualizadoEn: now,
          editadaEnFormulario: true,
        }
        const list = [...th.routeSheets]
        list[idx] = sheet
        const ro0 = th.offerId ? s.routeOfferPublic[th.offerId] : undefined
        const affectedCarriers = carrierUserIdsAffectedByRouteSheetParadas(ro0, routeSheetId, existing, paradas)
        const assignedOnSheet = confirmedCarrierIdsOnOffer(ro0, routeSheetId)

        let routeSheetEditAcks = th.routeSheetEditAcks ?? {}
        if (affectedCarriers.size > 0 && assignedOnSheet.size > 0) {
          const prevAck = routeSheetEditAcks[routeSheetId]
          const prevBy = prevAck?.byCarrier ?? {}
          const prevRev = prevAck?.revision ?? 0
          const nextBy: Record<string, 'pending' | 'accepted' | 'rejected'> = {}
          for (const uid of assignedOnSheet) {
            if (affectedCarriers.has(uid)) {
              nextBy[uid] = 'pending'
            } else {
              nextBy[uid] = prevBy[uid] === 'pending' ? 'pending' : (prevBy[uid] ?? 'accepted')
            }
          }
          routeSheetEditAcks = {
            ...routeSheetEditAcks,
            [routeSheetId]: { revision: prevRev + 1, byCarrier: nextBy },
          }
        }
        const sysEdit: Message = {
          id: uid('m'),
          from: 'system',
          type: 'text',
          text:
            affectedCarriers.size > 0 ?
              `Hoja de ruta «${titulo}» editada. Los transportistas cuyo tramo cambió deben aceptar o rechazar la versión actual en la pestaña Rutas (demo).`
            : `Hoja de ruta «${titulo}» editada.`,
          at: now,
        }
        ok = true
        return {
          ...s,
          routeOfferPublic: routeOfferPublicAfterSheetEdit(
            s.routeOfferPublic,
            threadId,
            routeSheetId,
            sheet,
          ),
          threads: {
            ...s.threads,
            [threadId]: {
              ...th,
              routeSheets: list,
              routeSheetEditAcks,
              messages: [...th.messages, sysEdit],
            },
          },
        }
      })
      return ok
    },

    setRouteSheetStatus: (threadId, routeSheetId, estado) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th?.routeSheets || threadIsActionLocked(th)) return s
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
        if (!th?.routeSheets || threadIsActionLocked(th)) return s
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
        if (!th || threadIsActionLocked(th) || !sheets?.length) return s
        const linked = routeSheetIdsLinkedToContracts(th)
        const allowedArr = [...idSet].filter((id) => linked.has(id))
        if (allowedArr.length === 0) return s
        const ro = s.routeOfferPublic[th.offerId]
        const now = Date.now()
        const extraMsgs: Message[] = []
        const list = sheets.map((rs) => {
          if (!allowedArr.includes(rs.id)) return rs
          if (!rs.publicadaPlataforma) {
            extraMsgs.push({
              id: uid('m'),
              from: 'system',
              type: 'text',
              text: `Hoja de ruta «${rs.titulo}» publicada en la plataforma. Los transportistas pueden suscribirse por tramo (demo).`,
              at: now,
            })
            return { ...rs, publicadaPlataforma: true, actualizadoEn: now }
          }
          if (ro?.routeSheetId === rs.id && !routeOfferTramosAllConfirmed(ro)) {
            extraMsgs.push({
              id: uid('m'),
              from: 'system',
              type: 'text',
              text: `Hoja de ruta «${rs.titulo}» republicada en la plataforma mientras queden tramos por cubrir (demo).`,
              at: now,
            })
            return { ...rs, actualizadoEn: now }
          }
          return rs
        })
        if (extraMsgs.length === 0) return s
        return {
          ...s,
          threads: {
            ...s.threads,
            [threadId]: {
              ...th,
              routeSheets: list,
              messages: [...th.messages, ...extraMsgs],
            },
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
        if (!th || threadIsActionLocked(th) || !contracts.length || !sheets.length) return s
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

    unlinkAgreementFromRouteSheet: (threadId, agreementId) => {
      let ok = false
      set((s) => {
        const th = s.threads[threadId]
        const contracts = th.contracts ?? []
        const sheets = th.routeSheets ?? []
        if (!th || threadIsActionLocked(th) || !contracts.length) return s
        const cIdx = contracts.findIndex((c) => c.id === agreementId)
        if (cIdx < 0) return s
        const prev = contracts[cIdx]
        const rid = prev.routeSheetId
        if (!rid) return s
        const sheet = sheets.find((r) => r.id === rid)
        if (sheet?.publicadaPlataforma) return s
        const nextContracts = [...contracts]
        nextContracts[cIdx] = { ...prev, routeSheetId: undefined }
        const titulo = sheet?.titulo ?? 'hoja de ruta'
        const sys: Message = {
          id: uid('m'),
          from: 'system',
          type: 'text',
          text: `Acuerdo «${prev.title}» desvinculado de la hoja de ruta «${titulo}».`,
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
        if (!th?.routeSheets?.length || threadIsActionLocked(th)) return s
        const sheet = th.routeSheets.find((r) => r.id === routeSheetId)
        if (!sheet) return s
        if (routeSheetHasConfirmedCarriers(s.routeOfferPublic, th, routeSheetId)) return s
        const list = th.routeSheets.filter((r) => r.id !== routeSheetId)
        const contracts = (th.contracts ?? []).map((c) =>
          c.routeSheetId === routeSheetId ? { ...c, routeSheetId: undefined } : c,
        )
        let routeOfferPublic = s.routeOfferPublic
        const ro = s.routeOfferPublic[th.offerId]
        if (ro?.routeSheetId === routeSheetId) {
          routeOfferPublic = { ...s.routeOfferPublic }
          delete routeOfferPublic[th.offerId]
        }
        const routeSheetEditAcks = { ...(th.routeSheetEditAcks ?? {}) }
        delete routeSheetEditAcks[routeSheetId]
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
          routeOfferPublic,
          threads: {
            ...s.threads,
            [threadId]: {
              ...th,
              routeSheets: list,
              contracts,
              routeSheetEditAcks,
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
        if (!th || threadIsActionLocked(th)) return s
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

    sendAudio: (threadId, payload, options) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th || threadIsActionLocked(th)) return s
        const replyQuotes = collectReplyQuotes(th, options?.replyToIds)
        const m: Message = {
          id: uid('m'),
          from: 'me',
          type: 'audio',
          url: payload.url,
          seconds: Math.max(1, Math.round(payload.seconds)),
          at: Date.now(),
          read: false,
          ...(replyQuotes && replyQuotes.length ? { replyQuotes } : {}),
        }
        return { ...s, threads: { ...s.threads, [threadId]: { ...th, messages: [...th.messages, m] } } }
      })
    },

    sendDocument: (threadId, payload, options) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th || threadIsActionLocked(th)) return s
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
        if (!th || threadIsActionLocked(th)) return s
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
        if (!th || threadIsActionLocked(th)) return s
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

    createOwnerStore: (ownerUserId, values) => {
      const name = values.name.trim()
      if (!name) return null
      const cats = values.categories.map((c) => c.trim()).filter(Boolean)
      const id = uid('ust')
      const badge: StoreBadge = {
        id,
        name,
        verified: false,
        categories: cats.length ? cats : ['Sin categoría'],
        transportIncluded: values.transportIncluded,
        trustScore: 65,
        ownerUserId,
      }
      const catalog: StoreCatalog = {
        pitch: values.categoryPitch.trim(),
        joinedAt: Date.now(),
        products: [],
        services: [],
      }
      set((s) => ({
        ...s,
        stores: { ...s.stores, [id]: badge },
        storeCatalogs: { ...s.storeCatalogs, [id]: catalog },
      }))
      return id
    },

    updateOwnerStore: (storeId, ownerUserId, patch) => {
      const s = get()
      if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
      const st = s.stores[storeId]
      const cat = s.storeCatalogs[storeId]
      if (!st || !cat) return false
      set((prev) => {
        const nextBadge: StoreBadge = {
          ...st,
          ...(patch.name !== undefined ? { name: patch.name.trim() || st.name } : {}),
          ...(patch.categories !== undefined
            ? {
                categories: patch.categories.length ? patch.categories : st.categories,
              }
            : {}),
          ...(patch.transportIncluded !== undefined
            ? { transportIncluded: patch.transportIncluded }
            : {}),
          ...(patch.avatarUrl !== undefined
            ? {
                avatarUrl:
                  patch.avatarUrl === null || patch.avatarUrl === ''
                    ? undefined
                    : patch.avatarUrl,
              }
            : {}),
        }
        const nextCat: StoreCatalog =
          patch.categoryPitch !== undefined ? { ...cat, pitch: patch.categoryPitch } : cat
        return {
          ...prev,
          stores: { ...prev.stores, [storeId]: nextBadge },
          storeCatalogs: { ...prev.storeCatalogs, [storeId]: nextCat },
        }
      })
      return true
    },

    deleteOwnerStore: (storeId, ownerUserId) => {
      const s = get()
      if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
      set((prev) => {
        const { [storeId]: _removed, ...restStores } = prev.stores
        const { [storeId]: _cat, ...restCat } = prev.storeCatalogs
        return { ...prev, stores: restStores, storeCatalogs: restCat }
      })
      return true
    },

    addOwnerStoreProduct: (storeId, ownerUserId, input) => {
      const s = get()
      if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return null
      const cat = s.storeCatalogs[storeId]
      if (!cat) return null
      const pid = uid('prd')
      const product: StoreProduct = { ...input, id: pid, storeId }
      set((prev) => ({
        ...prev,
        storeCatalogs: {
          ...prev.storeCatalogs,
          [storeId]: { ...cat, products: [...cat.products, product] },
        },
      }))
      return pid
    },

    updateOwnerStoreProduct: (storeId, ownerUserId, productId, input) => {
      const s = get()
      if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
      const cat = s.storeCatalogs[storeId]
      if (!cat) return false
      const idx = cat.products.findIndex((p) => p.id === productId)
      if (idx < 0) return false
      const next: StoreProduct = { ...input, id: productId, storeId }
      const products = [...cat.products]
      products[idx] = next
      set((prev) => ({
        ...prev,
        storeCatalogs: { ...prev.storeCatalogs, [storeId]: { ...cat, products } },
      }))
      return true
    },

    removeOwnerStoreProduct: (storeId, ownerUserId, productId) => {
      const s = get()
      if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
      const cat = s.storeCatalogs[storeId]
      if (!cat) return false
      set((prev) => ({
        ...prev,
        storeCatalogs: {
          ...prev.storeCatalogs,
          [storeId]: { ...cat, products: cat.products.filter((p) => p.id !== productId) },
        },
      }))
      return true
    },

    setOwnerStoreProductPublished: (storeId, ownerUserId, productId, published) => {
      const s = get()
      if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
      const cat = s.storeCatalogs[storeId]
      if (!cat) return false
      const idx = cat.products.findIndex((p) => p.id === productId)
      if (idx < 0) return false
      const products = [...cat.products]
      products[idx] = { ...products[idx], published }
      set((prev) => ({
        ...prev,
        storeCatalogs: { ...prev.storeCatalogs, [storeId]: { ...cat, products } },
      }))
      return true
    },

    setOwnerStoreServicePublished: (storeId, ownerUserId, serviceId, published) => {
      const s = get()
      if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
      const cat = s.storeCatalogs[storeId]
      if (!cat) return false
      const idx = cat.services.findIndex((x) => x.id === serviceId)
      if (idx < 0) return false
      const services = [...cat.services]
      services[idx] = { ...services[idx], published }
      set((prev) => ({
        ...prev,
        storeCatalogs: { ...prev.storeCatalogs, [storeId]: { ...cat, services } },
      }))
      return true
    },

    addOwnerStoreService: (storeId, ownerUserId, input) => {
      const s = get()
      if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return null
      const cat = s.storeCatalogs[storeId]
      if (!cat) return null
      const sid = uid('svc')
      const service: StoreService = { ...input, id: sid, storeId }
      set((prev) => ({
        ...prev,
        storeCatalogs: {
          ...prev.storeCatalogs,
          [storeId]: { ...cat, services: [...cat.services, service] },
        },
      }))
      return sid
    },

    updateOwnerStoreService: (storeId, ownerUserId, serviceId, input) => {
      const s = get()
      if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
      const cat = s.storeCatalogs[storeId]
      if (!cat) return false
      const idx = cat.services.findIndex((x) => x.id === serviceId)
      if (idx < 0) return false
      const next: StoreService = { ...input, id: serviceId, storeId }
      const services = [...cat.services]
      services[idx] = next
      set((prev) => ({
        ...prev,
        storeCatalogs: { ...prev.storeCatalogs, [storeId]: { ...cat, services } },
      }))
      return true
    },

    removeOwnerStoreService: (storeId, ownerUserId, serviceId) => {
      const s = get()
      if (!isOwnerOfStore(s.stores, storeId, ownerUserId)) return false
      const cat = s.storeCatalogs[storeId]
      if (!cat) return false
      set((prev) => ({
        ...prev,
        storeCatalogs: {
          ...prev.storeCatalogs,
          [storeId]: { ...cat, services: cat.services.filter((x) => x.id !== serviceId) },
        },
      }))
      return true
    },
})
