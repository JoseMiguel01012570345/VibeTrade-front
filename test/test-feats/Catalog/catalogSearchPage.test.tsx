import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  makeCatalogSearchProductItem,
  makeCatalogSearchStoreItem,
} from "@test/Resources/Catalog/search-factories";
import {
  renderCatalogSearch,
  submitCatalogSearch,
} from "@test/Resources/Catalog/render-catalog-search";
import { mockSearchCatalog } from "@test/Resources/Core/api-mocks";

describe("CatalogSearchPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("searches by name with limit 20 and offset 0", async () => {
    mockSearchCatalog.mockResolvedValueOnce({
      items: [makeCatalogSearchStoreItem("s1", "Tienda Resultado")],
      hasMore: false,
    });
    const user = userEvent.setup();
    renderCatalogSearch();
    const input = screen.getByLabelText(/buscar en catálogo/i);
    await user.type(input, "laptop");
    await submitCatalogSearch(user);
    await waitFor(() => {
      expect(mockSearchCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "laptop",
          limit: 20,
          offset: 0,
        }),
      );
    });
    expect(screen.getByText("Tienda Resultado")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /abrir tienda tienda resultado/i }),
    ).toHaveAttribute("href", "/store/s1/vitrina");
  });

  it("passes product kind filter to API", async () => {
    mockSearchCatalog.mockResolvedValueOnce({
      items: [makeCatalogSearchProductItem("p-1", "Producto X")],
      hasMore: false,
    });
    const user = userEvent.setup();
    renderCatalogSearch();
    await user.click(screen.getByRole("button", { name: /filtrar por tipo/i }));
    await user.click(screen.getByRole("option", { name: /^tiendas$/i }));
    await user.click(screen.getByRole("option", { name: /^servicios$/i }));
    await user.click(screen.getByRole("option", { name: /^hojas de ruta$/i }));
    await submitCatalogSearch(user);
    await waitFor(() => {
      expect(mockSearchCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          kinds: ["product"],
        }),
      );
    });
    expect(screen.getByText("Producto X")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /producto x/i })).toHaveAttribute(
      "href",
      "/offer/p-1",
    );
  });

  it("passes category, trust and geo filters", async () => {
    mockSearchCatalog.mockResolvedValueOnce({ items: [], hasMore: false });
    const user = userEvent.setup();
    renderCatalogSearch();
    await user.click(
      screen.getByRole("button", { name: /filtrar por categorías/i }),
    );
    await user.click(screen.getByRole("option", { name: /electrónica/i }));
    await user.type(screen.getByLabelText(/radio de búsqueda/i), "10");
    await user.type(screen.getByLabelText(/confianza mínima/i), "80");
    const geo = { lat: 4.6, lng: -74.1 };
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({
            coords: { latitude: geo.lat, longitude: geo.lng },
          } as GeolocationPosition),
      },
      configurable: true,
    });
    await submitCatalogSearch(user);
    await waitFor(() => {
      expect(mockSearchCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "Electrónica",
          trustMin: 80,
          lat: geo.lat,
          lng: geo.lng,
          km: 10,
          limit: 20,
          offset: 0,
        }),
      );
    });
  });

  it("paginates with Siguiente and Anterior", async () => {
    const page1 = Array.from({ length: 20 }, (_, i) =>
      makeCatalogSearchProductItem(`p-${i}`, `Item ${i}`),
    );
    mockSearchCatalog
      .mockResolvedValueOnce({ items: page1, hasMore: true })
      .mockResolvedValueOnce({
        items: [makeCatalogSearchProductItem("p-20", "Item 20")],
        hasMore: false,
      })
      .mockResolvedValueOnce({ items: page1, hasMore: true });
    const user = userEvent.setup();
    renderCatalogSearch();
    await submitCatalogSearch(user);
    await waitFor(() => {
      expect(screen.getByText("Item 0")).toBeInTheDocument();
    });
    expect(screen.getAllByRole("link").length).toBeLessThanOrEqual(25);
    await user.click(screen.getByRole("button", { name: /página siguiente/i }));
    await waitFor(() => {
      expect(mockSearchCatalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 20, limit: 20 }),
      );
    });
    expect(screen.getByText("Item 20")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /página anterior/i }));
    await waitFor(() => {
      expect(mockSearchCatalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 0 }),
      );
    });
    expect(screen.getByText("Item 0")).toBeInTheDocument();
  });
});
