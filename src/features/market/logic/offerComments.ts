export type { OfferCommentNorm } from "../Dtos/offerCommentsTypes";

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
