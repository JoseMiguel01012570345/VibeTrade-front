import { cn } from '../../../lib/cn'

/** Acuerdo / hoja de ruta (ancho) */
export const modalShellWide =
  'vt-modal flex max-h-[min(90vh,900px)] w-[min(920px,100%)] max-w-none flex-col'

/** Publicar rutas, coordenadas */
export const modalShellNarrow = 'vt-modal w-full max-w-[420px]'

export const modalFormBody =
  'vt-modal-body mt-2 flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto text-sm text-[var(--text)]'

export const modalSub = 'vt-muted mb-2 text-[13px]'

/** Contrato, acuerdo en burbuja, filas del rail */
export const statusPillPending =
  'inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-[color-mix(in_oklab,#f59e0b_22%,transparent)] text-amber-900'
export const statusPillOk =
  'inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-[color-mix(in_oklab,#16a34a_20%,transparent)] text-green-900'
export const statusPillNo =
  'inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-[color-mix(in_oklab,#dc2626_18%,transparent)] text-red-900'

export const fieldRoot = 'flex flex-col gap-1'

export const fieldLabel = 'text-xs font-bold text-[var(--muted)]'

export const fieldError = 'mt-1 text-xs font-semibold leading-[1.35] text-[#b91c1c]'

const fieldInvalidRing =
  '[&_.vt-input]:border-[#dc2626] [&_.vt-input]:shadow-[0_0_0_1px_color-mix(in_oklab,#dc2626_35%,transparent)]'

export function fieldRootWithInvalid(error?: boolean) {
  return cn(fieldRoot, error && fieldInvalidRing)
}

export const textareaMin = 'min-h-14 resize-y'

export const scopeRow = 'flex flex-wrap items-center gap-x-7 gap-y-3'

export const checkRow =
  'inline-flex cursor-pointer select-none items-center gap-2 text-sm font-semibold [&_input]:h-4 [&_input]:w-4 [&_input]:accent-[var(--primary)]'

export const detailsBlock =
  'rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] p-3 [&_summary]:cursor-pointer [&_summary]:font-extrabold [&_summary]:tracking-[-0.02em]'

export const merchLineWrap =
  'mt-3 rounded-[10px] border border-dashed border-[color-mix(in_oklab,var(--border)_90%,transparent)] p-2.5 first:mt-0'

export const merchLineHead = 'mb-2 flex items-center justify-between'

export const lineGrid =
  'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5'

export const rutaTramosBlock = 'mt-1'

export const rutaTramoCard =
  'mb-3 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] p-3 last:mb-0'

export const rutaTramoHead =
  'mb-2 flex flex-wrap items-center justify-between gap-2'

export const rutaTramoGrid =
  'grid grid-cols-1 gap-2.5 min-[561px]:grid-cols-2'

export const rutaCoordsRow = 'my-2 flex flex-wrap gap-2'

export const rutaMapBtn =
  'vt-btn vt-btn-ghost no-underline px-2.5 py-1.5 text-xs'

export const rutaTramoRemoveBtn =
  'vt-btn vt-btn-ghost vt-btn-sm no-underline inline-flex items-center gap-1.5 text-[var(--muted)] hover:text-[#c62828] disabled:hover:text-[var(--muted)]'

export const rutaCoordsHint = 'vt-muted mb-1.5 text-[11px]'

export const mapBackdropLayer = 'vt-modal-backdrop z-[90]'

/**
 * Modales montados en `ChatPage`: el panel lateral (móvil) va con el contenedor a `z-[100]`;
 * el `.vt-modal-backdrop` por defecto es `z-[80]`, por eso quedaría tapado. Usar esta capa.
 */
export const mapBackdropLayerAboveChatRail = 'vt-modal-backdrop z-[120]'

export const agrDetailRoot = 'flex flex-col gap-3.5 text-[13px]'

export const agrDetailBlock = 'border-t border-[var(--border)] pt-3'

export const agrDetailH = 'mb-2 font-black tracking-[-0.02em]'

export const agrDetailSub =
  'mb-1.5 text-[11px] font-extrabold text-[var(--muted)]'

export const agrDetailCard =
  'mb-2 rounded-[10px] border border-[var(--border)] p-2.5 last:mb-0'

export const agrDetailRow =
  'mb-1.5 grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-[minmax(120px,34%)_1fr]'

export const agrDetailLabel = 'text-[11px] font-bold text-[var(--muted)]'

export const agrDetailValue = 'break-words leading-snug'

export const agrDetailLink = 'break-all font-bold text-[var(--primary)]'

export const agrDetailHint = 'text-xs leading-[1.45]'

export const linkRutaRow = 'mb-2 flex flex-wrap items-end gap-2.5'

export const linkRutaSelect = 'flex min-w-[180px] flex-1 flex-col gap-1'

export const publishRutaList =
  'm-0 flex list-none flex-col gap-2 p-0'

export const publishRutaRow =
  'flex cursor-pointer items-center gap-2.5 text-[13px]'

export const publishRutaTitle = 'min-w-0 flex-1 font-semibold'
