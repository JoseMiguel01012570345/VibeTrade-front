/** Promedio de valoraciones -1…1 por usuario; sin votos → 0 (neutro). */
export function averageRating(ratingsByUser: Record<string, number>): number {
  const vals = Object.values(ratingsByUser)
  if (vals.length === 0) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** -1…1 → matiz 0 (rojo) … 120 (verde) para el indicador */
export function trustValueToHue(v: number): number {
  return ((v + 1) / 2) * 120
}
