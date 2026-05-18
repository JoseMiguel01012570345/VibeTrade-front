import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RECOMMENDATION_API_TAKE } from "@features/home/homeFeedMerge";
import { mockFetchRecommendationPage } from "@test/Resources/Core/api-mocks";
import { seedRecommendationFeed } from "@test/Resources/Core/store-builders";
import { makeHomeFeedBulk } from "@test/Resources/Home/feed-factories";
import {
  renderHomePage,
  seedTwoSlideHomeFeed,
} from "@test/Resources/Home/render-home-feed";
import { makeOffer } from "@test/Resources/Market/offer-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";

describe("HomePage feed", () => {
  it("does not fetch recommendations when the bag has only one slide", async () => {
    const offer = makeOffer({ id: "o-single", title: "Oferta única" });
    seedRecommendationFeed({
      bulks: [makeHomeFeedBulk(["o-single"])],
      offers: { [offer.id]: offer },
      stores: { [offer.storeId]: makeStoreBadge() },
    });
    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText("Oferta única")).toBeInTheDocument();
    });
    expect(mockFetchRecommendationPage).not.toHaveBeenCalled();
  });

  it("prefetches next recommendation bag on mount when bag has 2 slides", async () => {
    seedTwoSlideHomeFeed();
    renderHomePage();
    await waitFor(() => {
      expect(mockFetchRecommendationPage).toHaveBeenCalledWith(
        RECOMMENDATION_API_TAKE,
      );
    });
  });

  it("advances carousel slide on wheel when inner offers scroll is at bottom", async () => {
    seedTwoSlideHomeFeed();
    const { container } = renderHomePage();
    const viewport = screen.getByLabelText(/feed de ofertas por lotes/i);
    const scrollEl = container.querySelector(
      "[data-home-offers-scroll]",
    ) as HTMLElement;
    Object.defineProperty(scrollEl, "scrollTop", {
      value: 100,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(scrollEl, "scrollHeight", {
      value: 200,
      configurable: true,
    });
    Object.defineProperty(scrollEl, "clientHeight", {
      value: 100,
      configurable: true,
    });
    fireEvent.wheel(viewport, { deltaY: 200, deltaX: 0 });
    await waitFor(
      () => {
        const track = container.querySelector(
          "[style*='translateY']",
        ) as HTMLElement | null;
        expect(track?.style.transform).toBe("translateY(-100%)");
      },
      { timeout: 3000 },
    );
  });
});
