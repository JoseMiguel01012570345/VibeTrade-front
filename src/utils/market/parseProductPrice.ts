/** Límite superior para importes plausibles (evita IDs largos o texto mal parseado). */
export const MAX_REASONABLE_PRICE = 1_000_000_000_000; // 1e12

function digitCount(raw: string): number {
  return (raw.match(/\d/g) ?? []).length;
}

/** Intenta obtener un número comparable desde el texto de precio (ARS u otros formatos). */
export function parseProductPriceNumber(raw: string): number | null {
  const s = raw.replace(/\s/g, "").trim();
  if (!s) return null;
  if (digitCount(s) > 14) return null;
  let t = s.replace(/[^\d.,-]/g, "");
  if (!t) return null;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  if (lastComma > lastDot) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    t = t.replace(/,/g, "");
  }
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0 || n > MAX_REASONABLE_PRICE) return null;
  return n;
}

export function maxPriceFromProducts(products: { price: string }[]): number {
  let max = 0;
  for (const p of products) {
    const n = parseProductPriceNumber(p.price);
    if (n != null && n > max) max = n;
  }
  return Math.min(max, MAX_REASONABLE_PRICE);
}

/** Campos de texto donde puede aparecer un importe (servicios no tienen `price` dedicado). */
export type ServicePriceSource = {
  tipoServicio: string;
  descripcion: string;
  incluye: string;
  noIncluye: string;
  entregables: string;
  garantias?: { texto: string };
  propIntelectual: string;
  customFields?: { body: string }[];
};

/**
 * Estima un importe comparable desde el texto (p. ej. "desde $ 15.000" o "USD 200").
 * Usa el menor valor numérico encontrado (típico "desde…"). Sin números: null.
 */
export function serviceComparablePrice(s: ServicePriceSource): number | null {
  const parts = [
    s.tipoServicio,
    s.descripcion,
    s.incluye,
    s.noIncluye,
    s.entregables,
    s.garantias?.texto,
    s.propIntelectual,
    ...(s.customFields?.map((c) => c.body) ?? []),
  ].filter(Boolean);
  const blob = parts.join("\n");
  const nums: number[] = [];
  /** No usar `\d+` suelto: captura IDs largos. Tokens acotados (~precios con miles/decimales). */
  const re =
    /\$?\s*\d{1,3}(?:\.\d{3}){1,6}(?:,\d{1,4})?|\$?\s*\d{1,3}(?:,\d{3}){1,6}(?:\.\d{1,4})?|\$?\s*\d{1,12}(?:[.,]\d{1,4})?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blob)) !== null) {
    const token = m[0].trim();
    if (digitCount(token) > 14) continue;
    const n = parseProductPriceNumber(token);
    if (n != null && n > 0 && n <= MAX_REASONABLE_PRICE) nums.push(n);
  }
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

export function maxPriceFromServices(services: ServicePriceSource[]): number {
  let max = 0;
  for (const s of services) {
    const n = serviceComparablePrice(s);
    if (n != null && n > max) max = n;
  }
  return Math.min(max, MAX_REASONABLE_PRICE);
}

/** Orden estable: sin precio al final; asc = menor primero, desc = mayor primero. */
export function compareParsedPrices(
  a: number | null,
  b: number | null,
  order: "asc" | "desc",
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return order === "asc" ? a - b : b - a;
}

/** Si el precio empató o ambos son no parseables, aplica `tieBreak` (p. ej. nombre). */
export function compareParsedPricesWithTieBreak(
  a: number | null,
  b: number | null,
  order: "asc" | "desc",
  tieBreak: () => number,
): number {
  const main = compareParsedPrices(a, b, order);
  if (main !== 0) return main;
  return tieBreak();
}
