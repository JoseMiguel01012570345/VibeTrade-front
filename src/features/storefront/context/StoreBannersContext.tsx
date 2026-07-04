import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchStoreBannersPublic } from "@features/market/api/storeInventoryApi";
import type { StoreBannerDto } from "@features/market/Dtos/storeCatalogTypes";

type StoreBannersContextValue = {
  loading: boolean;
  mainBanners: StoreBannerDto[];
  secondaryBanners: StoreBannerDto[];
};

const StoreBannersContext = createContext<StoreBannersContextValue | null>(
  null,
);

export function StoreBannersProvider({
  storeId,
  children,
}: Readonly<{ storeId: string; children: ReactNode }>) {
  const [loading, setLoading] = useState(true);
  const [mainBanners, setMainBanners] = useState<StoreBannerDto[]>([]);
  const [secondaryBanners, setSecondaryBanners] = useState<StoreBannerDto[]>(
    [],
  );

  const load = useCallback(async () => {
    if (!storeId) {
      setMainBanners([]);
      setSecondaryBanners([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [mains, secondaries] = await Promise.all([
        fetchStoreBannersPublic(storeId, "main"),
        fetchStoreBannersPublic(storeId, "secondary"),
      ]);
      setMainBanners(mains);
      setSecondaryBanners(secondaries);
    } catch {
      setMainBanners([]);
      setSecondaryBanners([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo(
    (): StoreBannersContextValue => ({
      loading,
      mainBanners,
      secondaryBanners,
    }),
    [loading, mainBanners, secondaryBanners],
  );

  return (
    <StoreBannersContext.Provider value={value}>
      {children}
    </StoreBannersContext.Provider>
  );
}

export function useStoreBanners(): StoreBannersContextValue {
  const ctx = useContext(StoreBannersContext);
  if (!ctx) {
    throw new Error(
      "useStoreBanners debe usarse dentro de StoreBannersProvider",
    );
  }
  return ctx;
}
