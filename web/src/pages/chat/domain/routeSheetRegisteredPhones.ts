import type { ThreadChatCarrier } from '../../../app/store/marketStoreTypes'

export type TransportistaPhoneOption = { value: string; label: string }

function normTelKey(phone: string): string {
  return phone.replace(/[\s.]/g, '').replace(/-/g, '')
}

/**
 * Teléfonos elegibles en el formulario de hoja: sólo transportistas que ya figuran como integrantes del hilo
 * (`chatCarriers`), no postulantes sólo en la oferta pública.
 */
export function buildRegisteredTransportistaPhoneOptions(
  chatCarriers: ThreadChatCarrier[] | undefined,
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
