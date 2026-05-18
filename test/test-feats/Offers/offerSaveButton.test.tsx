import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { describe, expect, it } from "vitest";
import { OfferSaveButton } from "@features/market/pages/OfferSaveButton";
import {
  mockDeleteSavedOffer,
  mockPostSavedOffer,
} from "@test/Resources/Core/api-mocks";
import { seedAppStore, seedMarketStore } from "@test/Resources/Core/store-builders";
import { makeSessionUser } from "@test/Resources/Profile/profile-factories";
import { makeOffer } from "@test/Resources/Market/offer-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";

function seedOfferContext() {
  const offerId = "offer-other-1";
  seedAppStore({
    me: makeSessionUser({ id: "user-test-1" }),
    isSessionActive: true,
    savedOffers: {},
  });
  seedMarketStore({
    offers: { [offerId]: makeOffer({ id: offerId }) },
    offerIds: [offerId],
    stores: {
      "store-other": makeStoreBadge({
        id: "store-other",
        ownerUserId: "other-owner",
      }),
    },
  });
  return offerId;
}

describe("OfferSaveButton", () => {
  it("shows login toast when guest clicks save", async () => {
    seedAppStore({ me: makeSessionUser({ id: "guest" }), isSessionActive: false });
    seedMarketStore({
      offers: { "offer-1": makeOffer({ id: "offer-1" }) },
      stores: { "store-other": makeStoreBadge({ ownerUserId: "x" }) },
    });
    const user = userEvent.setup();
    render(<OfferSaveButton offerId="offer-1" />);
    await user.click(screen.getByRole("button", { name: /guardar oferta/i }));
    expect(toast.error).toHaveBeenCalledWith(
      "Inicia sesión para guardar ofertas.",
    );
    expect(mockPostSavedOffer).not.toHaveBeenCalled();
  });

  it("does not render for own offer", () => {
    seedAppStore({
      me: makeSessionUser({ id: "owner-1" }),
      isSessionActive: true,
    });
    seedMarketStore({
      offers: { "offer-1": makeOffer({ id: "offer-1", storeId: "store-1" }) },
      stores: {
        "store-1": makeStoreBadge({ id: "store-1", ownerUserId: "owner-1" }),
      },
    });
    const { container } = render(<OfferSaveButton offerId="offer-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("saves offer and updates store", async () => {
    const offerId = seedOfferContext();
    mockPostSavedOffer.mockResolvedValue([offerId]);
    const user = userEvent.setup();
    render(<OfferSaveButton offerId={offerId} />);
    await user.click(screen.getByRole("button", { name: /guardar oferta/i }));
    expect(mockPostSavedOffer).toHaveBeenCalledWith(offerId);
    expect(toast.success).toHaveBeenCalledWith("Guardada en tu perfil");
  });

  it("removes saved offer on second click", async () => {
    const offerId = seedOfferContext();
    seedAppStore({
      me: makeSessionUser(),
      isSessionActive: true,
      savedOffers: { [offerId]: true },
    });
    mockDeleteSavedOffer.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<OfferSaveButton offerId={offerId} />);
    await user.click(screen.getByRole("button", { name: /quitar de guardados/i }));
    expect(mockDeleteSavedOffer).toHaveBeenCalledWith(offerId);
    expect(toast.success).toHaveBeenCalledWith("Quitada de guardados");
  });
});
