import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileStoresSection } from "@features/profile/ProfileStoresSection";
import { seedAppStore, seedMarketStore } from "@test/Resources/Core/store-builders";
import { makeSessionUser } from "@test/Resources/Profile/profile-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";
import { makeStoreCatalog } from "@test/Resources/Market/catalog-factories";
import { renderWithRouter } from "@test/Resources/Profile/render-profile-section";

vi.mock("@/utils/market/fetchStoreDetail", () => ({
  fetchStoreDetail: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/utils/market/marketPersistence", () => ({
  saveMarketStoreProfiles: vi.fn().mockResolvedValue(undefined),
  setMarketHydrating: vi.fn(),
}));

vi.mock("@/utils/market/fetchCatalogCategories", () => ({
  fetchCatalogCategories: vi.fn().mockResolvedValue(["Electrónica"]),
}));

vi.mock("@features/profile/stores/StoreLocationMapModal", () => ({
  StoreLocationMapModal: () => null,
}));

describe("ProfileStoresSection CRUD", () => {
  beforeEach(() => {
    seedAppStore({
      me: makeSessionUser({ id: "user-test-1" }),
      isSessionActive: true,
    });
    seedMarketStore({ stores: {}, storeCatalogs: {} });
  });

  it("updates store name from edit modal", async () => {
    seedMarketStore({
      stores: {
        "store-a": makeStoreBadge({
          id: "store-a",
          name: "Alpha Shop",
          ownerUserId: "user-test-1",
        }),
      },
      storeCatalogs: { "store-a": makeStoreCatalog() },
    });
    const user = userEvent.setup();
    renderWithRouter(
      <ProfileStoresSection ownerUserId="user-test-1" canEdit />,
    );
    await user.click(screen.getByRole("button", { name: /editar datos/i }));
    const nameInput = screen.getByLabelText(/nombre de la tienda/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Tienda Renombrada");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));
    await waitFor(() => {
      expect(screen.getByText(/tienda renombrada/i)).toBeInTheDocument();
    });
  });
});
