/** Movimiento de la barra de confianza (local + servidor). */
export type TrustHistoryEntry = {
  id: string
  at: number
  /** Positivo = subida, negativo = bajada. */
  delta: number
  balanceAfter: number
  reason: string
}

/**
 * Referencia estable para defaults en selectores Zustand: un `[]` nuevo en cada snapshot
 * rompe useSyncExternalStore en React 18 (advertencia + bucle de re-render).
 */
export const EMPTY_TRUST_LEDGER_ENTRIES: TrustHistoryEntry[] = []
