import type { QAItem } from "@app/store/marketStoreTypes";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { OfferCommentsSection } from "@features/market/pages/OfferCommentsSection";
import { mockRefreshOfferQaFromServer, seedAppStore } from "@test/Resources/Core/store-builders";
import { makeOffer } from "@test/Resources/Market/offer-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";
import { makeSessionUser } from "@test/Resources/Profile/profile-factories";
import { makeOfferComment } from "./comment-factories";

export function renderOfferCommentsSection(
  commentOverrides: Parameters<typeof makeOfferComment>[0] = {},
) {
  const submitOfferQuestion = vi.fn().mockResolvedValue(undefined);
  const parentComment = makeOfferComment(commentOverrides);
  const offer = makeOffer({
    id: "offer-cmt",
    qa: [parentComment as unknown as QAItem],
  });
  const store = makeStoreBadge({ ownerUserId: "seller-1" });
  const me = makeSessionUser({ id: "buyer-1", name: "Comprador" });
  seedAppStore({
    me,
    isSessionActive: true,
  });
  const refreshMock = mockRefreshOfferQaFromServer();
  render(
    <OfferCommentsSection
      offer={offer}
      store={store}
      me={me}
      isSessionActive
      isOwnOffer={false}
      submitOfferQuestion={submitOfferQuestion}
    />,
  );
  return { submitOfferQuestion, refreshMock, offer, parentComment };
}
