import type { RouteSheet } from '../../pages/chat/domain/routeSheetTypes'
import { normalizeThreadMessages } from '../../utils/chat/chatMerge'
import { quoteAuthorForMessage } from '../../utils/chat/chatParticipantLabels'
import { normalizeOfferComments } from '../../pages/offer/offerComments'
import type { Message, Offer, ReplyQuote, Thread } from './marketStoreTypes'
import { useAppStore } from './useAppStore'

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

/** Datos viejos a nivel hoja: no persistir al guardar de nuevo. */
export function stripLegacyRouteSheetHead(s: RouteSheet): RouteSheet {
  const o = { ...s } as Record<string, unknown>
  delete o.responsabilidadEmbalaje
  delete o.requisitosEspeciales
  delete o.tipoVehiculoRequerido
  return o as RouteSheet
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

export function collectReplyQuotes(
  th: Thread,
  replyToIds: string[] | undefined,
): ReplyQuote[] | undefined {
  if (!replyToIds?.length) return undefined
  const me = useAppStore.getState().me
  const profileDisplayNames = useAppStore.getState().profileDisplayNames
  const list = replyToIds
    .map((id) => {
      const msg = th.messages.find((x) => x.id === id)
      if (!msg || msg.type === 'certificate') return null
      return {
        id: msg.id,
        author: quoteAuthorForMessage(msg, th, me.id, me.name, profileDisplayNames),
        preview: previewForMessage(msg),
      }
    })
    .filter((q): q is ReplyQuote => q !== null)
  return list.length ? list : undefined
}

/**
 * Añade al hilo los comentarios públicos de la ficha (comprador y vendedor del hilo).
 * `from` es relativo al usuario que ve el chat (`viewerUserId`), no al rol “comprador = me” fijo.
 */
export function syncOwnQaIntoMessages(
  prev: Message[],
  offer: Offer,
  threadBuyerUserId: string | undefined,
  sellerUserId?: string | null,
  viewerUserId?: string,
): Message[] {
  if (!threadBuyerUserId?.trim()) return prev

  const seller = sellerUserId ?? undefined
  const viewer = viewerUserId?.trim() || threadBuyerUserId
  const comments = normalizeOfferComments(offer)

  let next = [...prev]
  const atNums = next.map((m) => m.at).filter((x) => typeof x === 'number' && !Number.isNaN(x))
  let legacySeq = atNums.length ? Math.max(...atNums) + 1 : Date.now()

  function hasSeeded(commentId: string): boolean {
    return next.some((m) => m.type === 'text' && m.offerQaId === commentId)
  }

  for (const c of comments) {
    const isBuyer = c.author.id === threadBuyerUserId
    const isSeller = !!seller && c.author.id === seller
    if (!isBuyer && !isSeller) continue
    const from = c.author.id === viewer ? 'me' : 'other'
    const at = typeof c.createdAt === 'number' && !Number.isNaN(c.createdAt) ? c.createdAt : legacySeq++
    if (!hasSeeded(c.id)) {
      next.push({
        id: uid('m'),
        from,
        type: 'text',
        text: c.text,
        at,
        read: true,
        offerQaId: c.id,
      })
    }
  }

  return normalizeThreadMessages(next)
}

/** Solo el aviso de sistema (sin Q&A; la Q&A pública se añade vía syncOwnQaIntoMessages o el API). */
export function buildPurchaseThreadSystemOnly(offer: Offer): Message[] {
  return [
    {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: `Inicio de chat de compra · ${offer.title}. Credenciales del negocio y disponibilidad de transporte se destacan arriba.`,
      at: Date.now() - 90_000,
    },
  ]
}

/** Hilos locales sin persistencia: sistema + consultas públicas desde `offer.qa`. */
export function buildPurchaseThreadMessages(
  offer: Offer,
  threadBuyerUserId: string | undefined,
  sellerUserId?: string | null,
  viewerUserId?: string,
): Message[] {
  return syncOwnQaIntoMessages(
    buildPurchaseThreadSystemOnly(offer),
    offer,
    threadBuyerUserId,
    sellerUserId,
    viewerUserId,
  )
}

export function routeSheetIdsLinkedToContracts(th: Thread): Set<string> {
  const out = new Set<string>()
  for (const c of th.contracts ?? []) {
    if (c.routeSheetId) out.add(c.routeSheetId)
  }
  return out
}

/** Hojas vinculadas a un acuerdo con cobros exitosos (no editar / borrar / publicar). */
export function routeSheetIdsLockedByPaidAgreements(th: Thread): Set<string> {
  const out = new Set<string>()
  for (const c of th.contracts ?? []) {
    if (c.routeSheetId && c.hasSucceededPayments === true) out.add(c.routeSheetId)
  }
  return out
}

export function threadIsActionLocked(th: Thread | undefined): boolean {
  return th?.chatActionsLocked === true
}
