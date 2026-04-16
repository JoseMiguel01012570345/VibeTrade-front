import type { MouseEvent } from 'react'

/** Cerrar modal solo si el evento fue en el backdrop (no en el panel). */
export function onBackdropPointerClose(
  e: MouseEvent<HTMLDivElement>,
  onClose: () => void,
): void {
  if (e.target === e.currentTarget) onClose()
}
