import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "@shared/services/http/apiErrorMessage";

type StoreCatalogAutocompleteResponseJson = {
  suggestions?: unknown;
};

/** Autocompletado ILIKE del catálogo publicado de una tienda. */
export async function fetchStoreCatalogAutocomplete(
  storeId: string,
  q: string,
  limit = 10,
): Promise<string[]> {
  const term = q.trim();
  if (term.length < 2) return [];

  const qs = new URLSearchParams();
  qs.set("q", term);
  qs.set("limit", String(limit));

  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/catalog/autocomplete?${qs.toString()}`,
  );
  if (!res.ok) {
    if (res.status === 404) return [];
    const t = await res.text().catch(() => "");
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()));
  }

  const json = (await res.json()) as StoreCatalogAutocompleteResponseJson;
  const raw = json.suggestions;
  if (!Array.isArray(raw)) return [];

  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) out.push(x.trim());
  }
  return out;
}

export const storeCatalogAutocompleteQueryKey = (
  storeId: string,
  q: string,
  limit: number,
) => ["store-catalog-autocomplete", storeId, q.trim(), limit] as const;
