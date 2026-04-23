import type { VtSelectOption } from '../../../components/VtSelect'

const LABELS: Record<string, string> = {
  ARS: 'Peso argentino',
  BOB: 'Boliviano',
  BRL: 'Real brasileño',
  CLP: 'Peso chileno',
  COP: 'Peso colombiano',
  CUP: 'Peso cubano',
  DOP: 'Peso dominicano',
  EUR: 'Euro',
  GTQ: 'Quetzal',
  HNL: 'Lempira',
  MXN: 'Peso mexicano',
  NIO: 'Córdoba',
  PAB: 'Balboa',
  PEN: 'Sol',
  PYG: 'Guaraní',
  USD: 'Dólar estadounidense',
  UYU: 'Peso uruguayo',
  VES: 'Bolívar',
}

function labelForCode(code: string): string {
  const name = LABELS[code] ?? code
  return `${code} — ${name}`
}

/**
 * Opciones de moneda de pago (GET /api/v1/market/currencies).
 * Si `currentValue` no está en `allowedCodes`, se añade arriba para no perder datos antiguos.
 */
export function paymentCurrencyVtOptions(
  currentValue: string | undefined,
  allowedCodes: readonly string[],
): VtSelectOption[] {
  const t = (currentValue ?? '').trim()
  const base: VtSelectOption[] = [
    { value: '', label: '— Elegir moneda' },
    ...allowedCodes.map((code) => {
      const c = (code ?? '').trim()
      return { value: c, label: labelForCode(c) }
    }),
  ]
  if (t && !base.some((o) => o.value === t)) {
    return [{ value: t, label: `${t} (valor actual)` }, ...base]
  }
  return base
}
