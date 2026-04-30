import type { VtSelectOption } from "../../../components/VtSelect";

const LABELS: Record<string, string> = {
  CUP: "Peso cubano",
  CAD: "Dólar canadiense",
  EUR: "Euro",
  GBP: "Libra esterlina",
};

function labelForCode(code: string): string {
  const name = LABELS[code] ?? code;
  return `${code} — ${name}`;
}

/**
 * Opciones de moneda de pago (GET /api/v1/market/currencies).
 * Si `currentValue` no está en `allowedCodes`, se añade arriba para no perder datos antiguos.
 */
export function paymentCurrencyVtOptions(
  currentValue: string | undefined,
  allowedCodes: readonly string[],
): VtSelectOption[] {
  const t = (currentValue ?? "").trim();
  const base: VtSelectOption[] = [
    { value: "", label: "— Elegir moneda" },
    ...allowedCodes.map((code) => {
      const c = (code ?? "").trim();
      return { value: c, label: labelForCode(c) };
    }),
  ];
  if (t && !base.some((o) => o.value === t)) {
    return [{ value: t, label: `${t} (valor actual)` }, ...base];
  }
  return base;
}
