/** Tamaño máximo del JSON serializado de un producto o servicio (catálogo). */
export const MAX_ENTITY_PAYLOAD_BYTES = 5 * 1024 * 1024

export function entityJsonSizeBytes(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}

export function assertEntityPayloadUnderLimit(
  value: unknown,
  label: string,
): string | null {
  const n = entityJsonSizeBytes(value)
  if (n <= MAX_ENTITY_PAYLOAD_BYTES) return null
  const mb = (n / (1024 * 1024)).toFixed(2)
  return `${label} supera 5 MB serializado (${mb} MB). Reducí texto o adjuntos.`
}
