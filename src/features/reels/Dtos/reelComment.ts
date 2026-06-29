export type ReelComment = {
  id: string
  parentId: string | null
  authorName: string
  text: string
  at: number
  /** userId → valoración -1…1; el indicador usa el promedio (color + punto) */
  ratingsByUser: Record<string, number>
}
