import {
  makeContact,
  makePublicProfile,
  makeSessionUserJson,
  makeStripeCard,
  makeStripeConfig,
} from "@test/Resources/Profile/profile-factories";
import {
  mockAddContactByPhone,
  mockCreateStripeSetupIntent,
  mockDeleteSavedOffer,
  mockFetchContacts,
  mockFetchPublicProfile,
  mockGetStripeConfig,
  mockListStripeCards,
  mockLogoutWebApp,
  mockMediaApiUrl,
  mockPatchProfile,
  mockPatchProfileAvatar,
  mockPostSavedOffer,
  mockRemoveContact,
  mockUploadMedia,
  mockToggleOfferLike,
  mockToggleOfferQaCommentLike,
  mockFetchRecommendationPage,
  mockSearchCatalog,
  mockFetchCatalogAutocomplete,
} from "./vitest-mocks";

export function resetApiMocks() {
  const sessionJson = makeSessionUserJson();
  mockPatchProfile.mockResolvedValue(sessionJson);
  mockPatchProfileAvatar.mockResolvedValue(sessionJson);
  mockLogoutWebApp.mockResolvedValue(undefined);
  mockUploadMedia.mockResolvedValue({ id: "media-test-1" });
  mockMediaApiUrl.mockImplementation((id: string) => `/api/v1/media/${id}`);
  mockFetchPublicProfile.mockResolvedValue(makePublicProfile());
  mockFetchContacts.mockResolvedValue([]);
  mockAddContactByPhone.mockImplementation(async () => makeContact());
  mockRemoveContact.mockResolvedValue(undefined);
  mockGetStripeConfig.mockResolvedValue(makeStripeConfig());
  mockListStripeCards.mockResolvedValue([makeStripeCard()]);
  mockCreateStripeSetupIntent.mockResolvedValue({
    clientSecret: "seti_test_secret",
  });
  mockPostSavedOffer.mockResolvedValue([]);
  mockDeleteSavedOffer.mockResolvedValue([]);
  mockToggleOfferLike.mockResolvedValue({ likeCount: 1, liked: true });
  mockToggleOfferQaCommentLike.mockResolvedValue({
    likeCount: 1,
    liked: true,
  });
  mockFetchRecommendationPage.mockResolvedValue({
    offerIds: [],
    offers: {},
    threshold: 0.35,
  });
  mockSearchCatalog.mockResolvedValue({ items: [], hasMore: false });
  mockFetchCatalogAutocomplete.mockResolvedValue([]);
}
