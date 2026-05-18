import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OfferCardsChunk } from "@features/home/OfferCardsChunk";
import { seedAppStore, seedMarketStore } from "@test/Resources/Core/store-builders";
import { makeOffer } from "@test/Resources/Market/offer-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";
import { makeSessionUser } from "@test/Resources/Profile/profile-factories";

export function renderOfferCardsChunk(
  offerOverrides: Parameters<typeof makeOffer>[0] = {},
) {
  const offer = makeOffer({
    id: "offer-feed-1",
    title: "Laptop usada",
    offerLikeCount: 3,
    viewerLikedOffer: false,
    publicCommentCount: 2,
    ...offerOverrides,
  });
  const store = makeStoreBadge({
    id: offer.storeId,
    ownerUserId: "other-owner",
  });
  seedAppStore({
    me: makeSessionUser({ id: "user-test-1" }),
    isSessionActive: true,
  });
  seedMarketStore({
    offers: { [offer.id]: offer },
    stores: { [store.id]: store },
  });
  render(
    <MemoryRouter>
      <OfferCardsChunk
        items={[offer]}
        stores={{ [store.id]: store }}
        routeOfferPublic={{}}
      />
    </MemoryRouter>,
  );
  return offer;
}
