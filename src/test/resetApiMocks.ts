import {
  makeContact,
  makePublicProfile,
  makeSessionUserJson,
  makeStripeCard,
  makeStripeConfig,
} from "./profileFactories";
import {
  mockAddContactByPhone,
  mockCreateStripeSetupIntent,
  mockFetchContacts,
  mockFetchPublicProfile,
  mockGetStripeConfig,
  mockListStripeCards,
  mockLogoutWebApp,
  mockMediaApiUrl,
  mockPatchProfile,
  mockPatchProfileAvatar,
  mockRemoveContact,
  mockUploadMedia,
} from "./vitestMocks";

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
}
