import type { RouteOfferPublicState, ThreadChatCarrier } from '../../../app/store/marketStoreTypes'

export type TransportistaPhoneOption = { value: string; label: string }

function normTelKey(phone: string): string {
  return phone.replace(/[\s.]/g, '').replace(/-/g, '')
}

/**
 * Teléfonos “registrados” para el formulario de hoja: integrantes del chat y postulantes/asignados
 * en la oferta pública cuando corresponde a esta hoja.
 */
export function buildRegisteredTransportistaPhoneOptions(
  chatCarriers: ThreadChatCarrier[] | undefined,
  routeOffer: RouteOfferPublicState | undefined,
  routeSheetId: string | undefined,
): TransportistaPhoneOption[] {
  const byNorm = new Map<string, TransportistaPhoneOption>()
  function add(phone: string | undefined, name: string) {
    const p = phone?.trim()
    if (!p) return
    const key = normTelKey(p)
    if (!byNorm.has(key)) byNorm.set(key, { value: p, label: `${name} · ${p}` })
  }
  for (const c of chatCarriers ?? []) {
    add(c.phone, c.name)
  }
  if (routeSheetId && routeOffer?.routeSheetId === routeSheetId) {
    for (const t of routeOffer.tramos) {
      const a = t.assignment
      if (a) add(a.phone, a.displayName)
    }
  }
  return [...byNorm.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

/** Incluye el valor actual del tramo si no está en la lista (datos previos o migración). */
export function phoneSelectOptions(
  registered: TransportistaPhoneOption[],
  currentValue: string,
): TransportistaPhoneOption[] {
  const t = currentValue.trim()
  const base = [...registered]
  if (t && !base.some((o) => normTelKey(o.value) === normTelKey(t))) {
    base.unshift({ value: t, label: `${t} (no en lista actual)` })
  }
  return base
}
