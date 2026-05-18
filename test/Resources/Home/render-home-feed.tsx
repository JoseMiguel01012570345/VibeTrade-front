import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "@features/home/HomePage";
import { seedRecommendationFeed } from "@test/Resources/Core/store-builders";
import { makeOffer } from "@test/Resources/Market/offer-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";
import { makeHomeFeedBulk } from "./feed-factories";

export function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

export function seedTwoSlideHomeFeed() {
  const offers: Record<string, ReturnType<typeof makeOffer>> = {};
  const idsA = ["o-a1", "o-a2"];
  const idsB = ["o-b1"];
  for (const id of [...idsA, ...idsB]) {
    offers[id] = makeOffer({ id, title: `Oferta ${id}` });
  }
  seedRecommendationFeed({
    bulks: [makeHomeFeedBulk(idsA), makeHomeFeedBulk(idsB)],
    offers,
    stores: { "store-1": makeStoreBadge() },
  });
}
