import { useQuery } from "@tanstack/react-query";
import {
  fetchStoreCatalogSearch,
  storeCatalogSearchQueryKey,
} from "../api/fetchStoreCatalogSearch";

export function useStoreCatalogSearch(
  storeId: string | undefined,
  submittedQuery: string,
) {
  const q = submittedQuery.trim();
  const enabled = !!storeId && q.length > 0;

  return useQuery({
    queryKey: storeCatalogSearchQueryKey(storeId ?? "", q),
    queryFn: () => fetchStoreCatalogSearch(storeId!, q),
    enabled,
    staleTime: 30_000,
  });
}
