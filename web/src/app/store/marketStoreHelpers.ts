import type { RouteSheet } from '../../pages/chat/domain/routeSheetTypes'
import type { Message, Offer, QAItem, ReplyQuote, Thread } from './marketStoreTypes'

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

function authorForMessage(m: Message, storeName: string): string {
  if (m.from === 'me') return 'Tú'
  if (m.from === 'other') return storeName
  return 'Sistema'
}

export function collectReplyQuotes(
  th: Thread,
  replyToIds: string[] | undefined,
): ReplyQuote[] | undefined {
  if (!replyToIds?.length) return undefined
  const storeName = th.store.name
  const list = replyToIds
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
  return list.length ? list : undefined
}

function hasSeededQuestion(messages: Message[], q: QAItem): boolean {
  return messages.some((m) => {
    if (m.type !== 'text' || m.from !== 'me') return false
    if (m.offerQaId) return m.offerQaId === q.id
    return m.text === q.question
  })
}

function hasSeededAnswer(messages: Message[], q: QAItem): boolean {
  if (!q.answer) return true
  return messages.some((m) => {
    if (m.type !== 'text' || m.from !== 'other') return false
    if (m.offerQaId) return m.offerQaId === q.id
    return m.text === q.answer
  })
}

/** Añade al hilo las preguntas/respuestas del comprador que aún no estén reflejadas (p. ej. preguntó después del primer Comprar). */
export function syncOwnQaIntoMessages(
  prev: Message[],
  offer: Offer,
  buyerId: string | undefined,
): Message[] {
  if (!buyerId) return prev

  const ownQa = [...offer.qa]
    .filter((q) => q.askedBy.id === buyerId)
    .sort((a, b) => a.createdAt - b.createdAt)

  let next = [...prev]
  let t = next.length ? Math.max(...next.map((m) => m.at)) + 1 : Date.now()

  for (const q of ownQa) {
    if (!hasSeededQuestion(next, q)) {
      next.push({
        id: uid('m'),
        from: 'me',
        type: 'text',
        text: q.question,
        at: t++,
        read: true,
        offerQaId: q.id,
      })
    }
    if (q.answer && !hasSeededAnswer(next, q)) {
      next.push({
        id: uid('m'),
        from: 'other',
        type: 'text',
        text: q.answer,
        at: t++,
        read: true,
        offerQaId: q.id,
      })
    }
  }

  return next
}

export function buildPurchaseThreadMessages(offer: Offer, buyerId: string | undefined): Message[] {
  const messages: Message[] = []
  let seq = 0
  const base = Date.now() - 90_000

  messages.push({
    id: uid('m'),
    from: 'system',
    type: 'text',
    text: `Inicio de chat de compra · ${offer.title}. Credenciales del negocio y disponibilidad de transporte se destacan arriba.`,
    at: base + seq++ * 1000,
  })

  if (!buyerId) return messages

  const ownQa = [...offer.qa]
    .filter((q) => q.askedBy.id === buyerId)
    .sort((a, b) => a.createdAt - b.createdAt)

  for (const q of ownQa) {
    const tQ = base + seq++ * 1000
    const tA = base + seq++ * 1000

    messages.push({
      id: uid('m'),
      from: 'me',
      type: 'text',
      text: q.question,
      at: tQ,
      read: true,
      offerQaId: q.id,
    })

    if (q.answer) {
      messages.push({
        id: uid('m'),
        from: 'other',
        type: 'text',
        text: q.answer,
        at: tA,
        read: true,
        offerQaId: q.id,
      })
    }
  }

  return messages
}

export function routeSheetIdsLinkedToContracts(th: Thread): Set<string> {
  const out = new Set<string>()
  for (const c of th.contracts ?? []) {
    if (c.routeSheetId) out.add(c.routeSheetId)
  }
  return out
}

export function threadIsActionLocked(th: Thread | undefined): boolean {
  return th?.chatActionsLocked === true
}
