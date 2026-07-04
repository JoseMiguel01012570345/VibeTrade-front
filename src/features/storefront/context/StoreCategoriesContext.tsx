import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchStoreCategories } from "@features/market/api/storeInventoryApi";
import type { StoreCategoryDto } from "@features/market/Dtos/storeCatalogTypes";
import { buildGuestCategoryMetas } from "../logic/categoryTree/buildGuestCategoryMetas";
import type { CategoryMeta } from "../logic/categoryTree/categoryMeta";

type StoreCategoriesContextValue = {
  loading: boolean;
  error: string | null;
  categories: StoreCategoryDto[];
  categoryMetas: CategoryMeta[];
  refetch: () => Promise<void>;
};

const StoreCategoriesContext =
  createContext<StoreCategoriesContextValue | null>(null);

export function StoreCategoriesProvider({
  storeId,
  children,
}: Readonly<{ storeId: string; children: ReactNode }>) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<StoreCategoryDto[]>([]);

  const load = useCallback(async () => {
    if (!storeId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStoreCategories(storeId);
      setCategories(data);
    } catch {
      setError("No se pudieron cargar las categorías.");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryMetas = useMemo(
    () => buildGuestCategoryMetas(categories),
    [categories],
  );

  const value = useMemo(
    (): StoreCategoriesContextValue => ({
      loading,
      error,
      categories,
      categoryMetas,
      refetch: load,
    }),
    [loading, error, categories, categoryMetas, load],
  );

  return (
    <StoreCategoriesContext.Provider value={value}>
      {children}
    </StoreCategoriesContext.Provider>
  );
}

export function useStoreCategories(): StoreCategoriesContextValue {
  const ctx = useContext(StoreCategoriesContext);
  if (!ctx) {
    throw new Error(
      "useStoreCategories debe usarse dentro de StoreCategoriesProvider",
    );
  }
  return ctx;
}
