/** Evita prefijo "+" duplicado al mostrar teléfonos en UI. */
export function formatPhoneForDisplay(
  phone: string | undefined | null,
): string {
  const raw = (phone ?? "").trim();
  if (!raw) return "";
  return raw.startsWith("+") ? raw : `+${raw}`;
}
