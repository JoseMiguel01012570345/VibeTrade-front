import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAppStore } from "@app/store/useAppStore";
import { makeOffer } from "@test/Resources/Market/offer-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";
import { renderProfileAccount } from "@test/Resources/Profile/profile-helpers";
import { makeSessionUser } from "@test/Resources/Profile/profile-factories";

describe("profile saved offers", () => {
  it("lists saved offers and links to offer page", async () => {
    const offer = makeOffer({ id: "saved-offer-1", title: "Oferta guardada" });
    renderProfileAccount({
      route: "/profile/me/saved",
      me: makeSessionUser(),
      savedOffers: { [offer.id]: true },
      marketOffers: { [offer.id]: offer },
      marketStores: { [offer.storeId]: makeStoreBadge() },
    });
    await waitFor(() => {
      expect(screen.getByText("Ofertas guardadas")).toBeInTheDocument();
    });
    expect(screen.getByText("Oferta guardada")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /oferta guardada/i });
    expect(link).toHaveAttribute("href", "/offer/saved-offer-1");
  });

  it("shows offer after setSavedOffersFromIds", async () => {
    const offer = makeOffer({ id: "new-saved-1", title: "Nueva guardada" });
    renderProfileAccount({
      route: "/profile/me/saved",
      me: makeSessionUser(),
      savedOffers: {},
      marketOffers: { [offer.id]: offer },
      marketStores: { [offer.storeId]: makeStoreBadge() },
    });
    useAppStore.getState().setSavedOffersFromIds(["new-saved-1"]);
    await waitFor(() => {
      expect(screen.getByText("Nueva guardada")).toBeInTheDocument();
    });
  });
});
