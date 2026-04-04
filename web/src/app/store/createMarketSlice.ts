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
import type { MarketState, Message, Offer, Thread } from './marketStoreTypes'
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
import { demoOffers, demoStores } from './marketStoreSeed'

export const createMarketSlice: StateCreator<MarketState> = (set, get) => {
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
        if (ag.status !== 'pending_buyer' && ag.status !== 'rejected') return s
        if (ag.issuedByStoreId !== th.storeId) return s
        applied = true
        const wasRejected = ag.status === 'rejected'
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
          status: 'pending_buyer',
          respondedAt: undefined,
        }
        const nextMessages = th.messages.map((m) =>
          m.type === 'agreement' && m.agreementId === agreementId ? { ...m, title } : m,
        )
        const sysText = wasRejected
          ? `El vendedor revisó el acuerdo «${title}» tras el rechazo; volvió a quedar pendiente de respuesta del comprador.`
          : `El vendedor actualizó el acuerdo «${title}» (sigue pendiente de respuesta del comprador).`
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
        if (!threadHasAcceptedAgreement(th)) {
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

    createRouteSheet: (threadId, payload) => {
      const th0 = get().threads[threadId]
      if (threadIsActionLocked(th0)) return null
      if (!th0 || !threadHasAcceptedAgreement(th0)) return null
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
      if (threadIsActionLocked(get().threads[threadId])) return false
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
          completada: false as boolean | undefined,
        }))
      let ok = false
      set((s) => {
        const th = s.threads[threadId]
        if (!th?.routeSheets || threadIsActionLocked(th)) return s
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
        const allowed = new Set([...idSet].filter((id) => linked.has(id)))
        if (allowed.size === 0) return s
        const now = Date.now()
        const list = sheets.map((rs) =>
          allowed.has(rs.id) && !rs.publicadaPlataforma
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

    deleteRouteSheet: (threadId, routeSheetId) => {
      let ok = false
      set((s) => {
        const th = s.threads[threadId]
        if (!th?.routeSheets?.length || threadIsActionLocked(th)) return s
        const sheet = th.routeSheets.find((r) => r.id === routeSheetId)
        if (!sheet) return s
        if (sheet.publicadaPlataforma) return s
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

    sendAudio: (threadId, payload) => {
      set((s) => {
        const th = s.threads[threadId]
        if (!th || threadIsActionLocked(th)) return s
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
  }

}
