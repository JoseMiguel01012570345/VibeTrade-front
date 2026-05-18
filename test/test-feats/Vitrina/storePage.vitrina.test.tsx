import "@test/Resources/Market/mocks/setup-store-page-vitrina";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderStorePage } from "@test/Resources/Market/render-store-page";
import {
  makeStoreCatalog,
  makeStoreProduct,
} from "@test/Resources/Market/catalog-factories";

describe("StorePage vitrina", () => {
  it("shows only published products on public vitrina", async () => {
    renderStorePage({
      path: "/store/store-1/vitrina",
      viewerUserId: "visitor-1",
      catalog: makeStoreCatalog({
        products: [
          makeStoreProduct({ name: "Producto Visible", published: true }),
          makeStoreProduct({
            id: "prod-hidden",
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
