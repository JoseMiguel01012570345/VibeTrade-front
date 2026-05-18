export function finiteDuration(sec: number, fallback: number): number {
  if (Number.isFinite(sec) && sec > 0) return sec
  if (Number.isFinite(fallback) && fallback > 0) return fallback
  return 0
}

export function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const s = Math.floor(Math.min(sec, 359_999))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}
