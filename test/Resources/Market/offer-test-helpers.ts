import { seedAppStore, seedMarketStore } from "@test/Resources/Core/store-builders";
import { makeOffer } from "@test/Resources/Market/offer-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";
import { makeSessionUser } from "@test/Resources/Profile/profile-factories";

export function seedOfferSaveButtonContext(offerId = "offer-other-1") {
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
