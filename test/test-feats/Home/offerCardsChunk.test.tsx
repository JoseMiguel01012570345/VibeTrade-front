import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { OfferCardsChunk } from "@features/home/OfferCardsChunk";
import { useAppStore } from "@app/store/useAppStore";
import { useMarketStore } from "@app/store/useMarketStore";
import { mockToggleOfferLike } from "@test/Resources/Core/api-mocks";
import { seedAppStore, seedMarketStore } from "@test/Resources/Core/store-builders";
import { renderOfferCardsChunk } from "@test/Resources/Home/render-offer-cards-chunk";
import { makeOffer } from "@test/Resources/Market/offer-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";
import { makeSessionUser } from "@test/Resources/Profile/profile-factories";

describe("OfferCardsChunk", () => {
  it("links offer title to offer page", () => {
    renderOfferCardsChunk();
    const link = screen.getByRole("link", { name: /laptop usada/i });
    expect(link).toHaveAttribute("href", "/offer/offer-feed-1");
  });

  it("toggles offer like from home feed", async () => {
    renderOfferCardsChunk();
    const user = userEvent.setup();
    await user.click(screen.getByTitle(/me gusta/i));
    await waitFor(() => {
      expect(mockToggleOfferLike).toHaveBeenCalledWith("offer-feed-1");
    });
    expect(useMarketStore.getState().offers["offer-feed-1"]?.viewerLikedOffer).toBe(
      true,
    );
    expect(useMarketStore.getState().offers["offer-feed-1"]?.offerLikeCount).toBe(1);
  });

  it("opens auth modal when guest likes", async () => {
    const offer = makeOffer({ id: "offer-guest", title: "Oferta guest" });
    seedAppStore({ me: makeSessionUser({ id: "guest" }), isSessionActive: false });
    seedMarketStore({
      offers: { [offer.id]: offer },
      stores: {
        [offer.storeId]: makeStoreBadge({ ownerUserId: "x" }),
      },
    });
    render(
      <MemoryRouter>
        <OfferCardsChunk
          items={[offer]}
          stores={{ [offer.storeId]: makeStoreBadge({ ownerUserId: "x" }) }}
          routeOfferPublic={{}}
        />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByTitle(/me gusta/i));
    expect(useAppStore.getState().authModalOpen).toBe(true);
    expect(mockToggleOfferLike).not.toHaveBeenCalled();
  });

  it("shows comment count", () => {
    renderOfferCardsChunk({ publicCommentCount: 1 });
    expect(screen.getByText(/1/)).toBeInTheDocument();
    expect(screen.getByText(/comentario$/i)).toBeInTheDocument();
  });
});
