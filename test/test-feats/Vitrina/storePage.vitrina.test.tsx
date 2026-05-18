import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderStorePage } from "@test/Resources/Market/render-store-page";
import {
  makeStoreCatalog,
  makeStoreProduct,
} from "@test/Resources/Market/catalog-factories";

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

describe("StorePage vitrina", () => {
  it("shows only published products on public vitrina", async () => {
    renderStorePage({
      path: "/store/store-1/vitrina",
      viewerUserId: "visitor-1",
      catalog: makeStoreCatalog({
        products: [
          makeStoreProduct({ name: "Producto Visible", published: true }),
          makeStoreProduct({
            id: "p-hidden",
            name: "Producto Oculto",
            published: false,
          }),
        ],
        services: [],
      }),
    });
    expect(await screen.findByText("Producto Visible")).toBeInTheDocument();
    expect(screen.queryByText("Producto Oculto")).not.toBeInTheDocument();
  });
});
