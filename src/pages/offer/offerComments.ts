import type { Offer, QAItem } from '../../app/store/marketStoreTypes'

/** Comentario normalizado (reels: lista plana + parentId). */
export type OfferCommentNorm = {
  id: string
  parentId: string | null
  text: string
  author: { id: string; name: string; trustScore: number }
  createdAt: number
}

/** Nombre visible: perfil actual del viewer y `profileDisplayNames` para el resto (tras renombrar, etc.). */
export function resolveOfferCommentAuthorLabel(
  author: { id: string; name: string },
  ctx: {
    viewerId: string
    viewerName: string
    profileDisplayNames: Record<string, string>
  },
): string {
  if (author.id === ctx.viewerId && ctx.viewerName.trim()) return ctx.viewerName.trim()
  const fromMap = ctx.profileDisplayNames[author.id]?.trim()
  if (fromMap) return fromMap
  return author.name.trim() || 'Usuario'
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

/** Convierte ítems legacy (question/answer) y nuevos (text/parentId) a lista plana ordenada por tiempo. */
export function normalizeOfferComments(offer: Offer): OfferCommentNorm[] {
  const raw = offer.qa ?? []
  const out: OfferCommentNorm[] = []
  for (const item of raw as unknown[]) {
    if (!isRecord(item)) continue
    const id = typeof item.id === 'string' ? item.id : ''
    if (!id) continue

    const parentId =
      typeof item.parentId === 'string' && item.parentId.length > 0
        ? item.parentId
        : null

    const textFromNew =
      typeof item.text === 'string' && item.text.trim()
        ? item.text.trim()
        : typeof item.question === 'string'
          ? item.question.trim()
          : ''
    if (!textFromNew) continue

    const authorNew = item.author as { id?: string; name?: string; trustScore?: number } | undefined
    const askedBy = item.askedBy as { id?: string; name?: string; trustScore?: number } | undefined
    const author = authorNew?.id
      ? {
          id: String(authorNew.id),
          name: String(authorNew.name ?? ''),
          trustScore: typeof authorNew.trustScore === 'number' ? authorNew.trustScore : 0,
        }
      : askedBy?.id
        ? {
            id: String(askedBy.id),
            name: String(askedBy.name ?? ''),
            trustScore: typeof askedBy.trustScore === 'number' ? askedBy.trustScore : 0,
          }
        : null
    if (!author) continue

    const createdAt =
      typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
        ? item.createdAt
        : Date.now()

    out.push({
      id,
      parentId,
      text: textFromNew,
      author,
      createdAt,
    })

    const legacy = item as unknown as QAItem
    const isOldShape = !('text' in item) && legacy.answer && legacy.answeredBy && !parentId
    if (isOldShape) {
      out.push({
        id: `${id}_legacy_ans`,
        parentId: id,
        text: legacy.answer!,
        author: legacy.answeredBy!,
        createdAt: createdAt + 1,
      })
    }
  }

  return out.sort((a, b) => a.createdAt - b.createdAt)
}
