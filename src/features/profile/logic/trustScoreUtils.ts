export const TRUST_STORE_MAX = 100;

export const TRUST_BAR_MIN = -50;
export const TRUST_BAR_MAX = 100;

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function trustStoreScoreToPct(score: number): number {
  const safe = Number.isFinite(score) ? score : 0;
  return (clamp(safe, 0, TRUST_STORE_MAX) / TRUST_STORE_MAX) * 100;
}

export function trustBarValueToPct(
  value: number,
  min = TRUST_BAR_MIN,
  max = TRUST_BAR_MAX,
): number {
  return ((clamp(value, min, max) - min) / (max - min)) * 100;
}
