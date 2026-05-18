import React from "react";
import { vi } from "vitest";

export const mockPatchProfile = vi.fn();
export const mockPatchProfileAvatar = vi.fn();
export const mockLogoutWebApp = vi.fn();
export const mockUploadMedia = vi.fn();
export const mockMediaApiUrl = vi.fn();
export const mockFetchPublicProfile = vi.fn();
export const mockFetchContacts = vi.fn();
export const mockAddContactByPhone = vi.fn();
export const mockRemoveContact = vi.fn();
export const mockGetStripeConfig = vi.fn();
export const mockListStripeCards = vi.fn();
export const mockCreateStripeSetupIntent = vi.fn();
export const mockNavigate = vi.fn();
export const mockPostSavedOffer = vi.fn();
export const mockDeleteSavedOffer = vi.fn();

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@features/auth/api/patchProfile", () => ({
  patchProfile: (...args: unknown[]) => mockPatchProfile(...args),
  patchProfileAvatar: (...args: unknown[]) => mockPatchProfileAvatar(...args),
}));

vi.mock("@features/auth/api/logoutWebApp", () => ({
  logoutWebApp: (...args: unknown[]) => mockLogoutWebApp(...args),
}));

vi.mock("@/utils/media/mediaClient", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/media/mediaClient")>();
  return {
    ...actual,
    uploadMedia: (...args: unknown[]) => mockUploadMedia(...args),
    mediaApiUrl: (...args: unknown[]) => mockMediaApiUrl(...args),
  };
});

vi.mock("@features/auth/api/fetchPublicProfile", () => ({
  fetchPublicProfile: (...args: unknown[]) => mockFetchPublicProfile(...args),
}));

vi.mock("@/utils/contacts/contactsApi", () => ({
  fetchContacts: (...args: unknown[]) => mockFetchContacts(...args),
  addContactByPhone: (...args: unknown[]) => mockAddContactByPhone(...args),
  removeContact: (...args: unknown[]) => mockRemoveContact(...args),
}));

vi.mock("@features/payments/api/stripeApi", () => ({
  getStripeConfig: (...args: unknown[]) => mockGetStripeConfig(...args),
  listStripeCards: (...args: unknown[]) => mockListStripeCards(...args),
  createStripeSetupIntent: (...args: unknown[]) =>
    mockCreateStripeSetupIntent(...args),
}));

vi.mock("@/utils/savedOffers/savedOffersApi", () => ({
  postSavedOffer: (...args: unknown[]) => mockPostSavedOffer(...args),
  deleteSavedOffer: (...args: unknown[]) => mockDeleteSavedOffer(...args),
}));

vi.mock("@app/widgets/UserTrustHistoryButton", () => ({
  UserTrustHistoryButton: () => null,
}));

vi.mock("@/utils/reels/reelsBootstrapState", () => ({
  reelTitlesById: () => ({}),
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn().mockResolvedValue({
    confirmSetup: vi.fn(),
  }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="stripe-payment-element" />,
  useStripe: () => ({
    confirmSetup: vi
      .fn()
      .mockResolvedValue({ error: null, setupIntent: { status: "succeeded" } }),
  }),
  useElements: () => ({
    submit: vi.fn().mockResolvedValue({ error: null }),
  }),
}));
