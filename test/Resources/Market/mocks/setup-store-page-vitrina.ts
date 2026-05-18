import { vi } from "vitest";

vi.mock("@/utils/market/fetchStoreDetail", () => ({
  fetchStoreDetail: vi.fn(async (storeId: string) => {
    const { useMarketStore } = await import("@app/store/useMarketStore");
    const state = useMarketStore.getState();
    return {
      store: state.stores[storeId],
      catalog: state.storeCatalogs[storeId],
    };
  }),
}));

vi.mock("@/utils/market/fetchCatalogCategories", () => ({
  fetchCatalogCategories: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/utils/market/fetchCurrencies", () => ({
  fetchCurrencies: vi.fn().mockResolvedValue([]),
}));
