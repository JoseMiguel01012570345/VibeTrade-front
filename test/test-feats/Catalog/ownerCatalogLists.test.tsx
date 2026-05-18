import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  OwnerCatalogProductList,
  OwnerCatalogServiceList,
} from "@features/market/pages/StoreOwnerCatalogLists";
import { makeStoreCatalog, makeStoreProduct, makeStoreService } from "@test/Resources/Market/catalog-factories";

describe("OwnerCatalogProductList", () => {
  const cat = makeStoreCatalog({
    products: [
      makeStoreProduct({ id: "p1", name: "Visible", published: true }),
      makeStoreProduct({ id: "p2", name: "Hidden", published: false }),
    ],
    services: [],
  });

  it("toggles publish state", async () => {
    const onTogglePublished = vi.fn();
    const user = userEvent.setup();
    render(
      <OwnerCatalogProductList
        cat={cat}
        onAdd={() => {}}
        onEdit={() => {}}
        onRemove={() => {}}
        onTogglePublished={onTogglePublished}
        onReload={() => {}}
        catalogReloadBusy={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /ocultar/i }));
    expect(onTogglePublished).toHaveBeenCalledWith("p1", false);
  });

  it("calls remove handler", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <OwnerCatalogProductList
        cat={cat}
        onAdd={() => {}}
        onEdit={() => {}}
        onRemove={onRemove}
        onTogglePublished={() => {}}
        onReload={() => {}}
        catalogReloadBusy={false}
      />,
    );
    const quitarButtons = screen.getAllByRole("button", { name: /quitar/i });
    await user.click(quitarButtons[0]);
    expect(onRemove).toHaveBeenCalled();
  });
});

describe("OwnerCatalogServiceList", () => {
  it("shows publish label for draft service", () => {
    const cat = makeStoreCatalog({
      products: [],
      services: [makeStoreService({ published: false })],
    });
    render(
      <OwnerCatalogServiceList
        cat={cat}
        onAdd={() => {}}
        onEdit={() => {}}
        onRemove={() => {}}
        onTogglePublished={() => {}}
        onReload={() => {}}
        catalogReloadBusy={false}
      />,
    );
    expect(screen.getByText(/borrador/i)).toBeInTheDocument();
  });
});
