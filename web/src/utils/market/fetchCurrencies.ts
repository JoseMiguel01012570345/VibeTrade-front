import { apiFetch } from "../http/apiClient";

export type CurrenciesJson = {
  currencies: string[];
};

/** GET /api/v1/market/currencies — códigos de moneda permitidos (p. ej. USD, EUR, CUP). */
export async function fetchCurrencies(): Promise<string[]> {
  const res = await apiFetch("/api/v1/market/currencies");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `currencies ${res.status}`);
  }
  const json = (await res.json()) as CurrenciesJson;
  const list = json.currencies;
  return Array.isArray(list)
    ? list.filter((c) => typeof c === "string" && c.trim().length > 0)
    : [];
}
