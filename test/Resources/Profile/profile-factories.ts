import type { User } from "@app/store/useAppStore";
import type { SessionUserJson } from "@features/auth/api/sessionUser";
import type { PublicUserProfile } from "@features/auth/api/fetchPublicProfile";
import type { UserContact } from "@/utils/contacts/contactsApi";
import type {
  StripeConfig,
  StripeSavedCard,
} from "@features/payments/api/stripeApi";

export function makeSessionUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-test-1",
    name: "Ana Test",
    email: "ana@test.com",
    phone: "5491112345678",
    trustScore: 80,
    ...overrides,
  };
}

export function makeSessionUserJson(
  overrides: Partial<SessionUserJson> = {},
): SessionUserJson {
  const u = makeSessionUser(overrides as Partial<User>);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    trustScore: u.trustScore,
    avatarUrl: u.avatarUrl,
    instagram: u.instagram,
    telegram: u.telegram,
    xAccount: u.xAccount,
    ...overrides,
  };
}

export function makePublicProfile(
  overrides: Partial<PublicUserProfile> = {},
): PublicUserProfile {
  return {
    id: "visitor-user-2",
    name: "Visitante Demo",
    trustScore: 70,
    ...overrides,
  };
}

export function makeContact(overrides: Partial<UserContact> = {}): UserContact {
  return {
    userId: "contact-user-1",
    displayName: "Contacto Uno",
    phoneDisplay: "+54 9 11 5555-0000",
    phoneDigits: "5491155550000",
    createdAt: "2025-01-15T12:00:00.000Z",
    ...overrides,
  };
}

export function makeStripeCard(
  overrides: Partial<StripeSavedCard> = {},
): StripeSavedCard {
  return {
    id: "pm_test_1",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2030,
    ...overrides,
  };
}

export function makeStripeConfig(
  overrides: Partial<StripeConfig> = {},
): StripeConfig {
  return {
    enabled: true,
    publishableKey: "pk_test_mock",
    ...overrides,
  };
}
