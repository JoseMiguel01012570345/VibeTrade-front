/** Comentario normalizado (reels: lista plana + parentId). */
export type OfferCommentNorm = {
  id: string
  parentId: string | null
  text: string
  author: { id: string; name: string; trustScore: number }
  createdAt: number
  likeCount?: number
  viewerLiked?: boolean
}
