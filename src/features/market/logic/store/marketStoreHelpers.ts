import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import { quoteAuthorForMessage } from "@features/chat/logic/participants/chatParticipantLabels"
import type { Message, Offer, ReplyQuote, Thread } from './marketStoreTypes'
import { useAppStore } from '@features/auth/logic/useAppStore'

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

/** Solo el aviso de sistema del hilo de compra. */
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

export function routeSheetIdsLinkedToContracts(th: Thread): Set<string> {
  const out = new Set<string>()
  for (const c of th.contracts ?? []) {
    if (c.routeSheetId) out.add(c.routeSheetId)
  }
  return out
}

/** Hojas vinculadas a un acuerdo con cobros exitosos (no editar / borrar). */
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
