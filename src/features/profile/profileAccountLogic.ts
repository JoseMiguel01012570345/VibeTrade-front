import type { SocialNetworkId } from "@app/store/useAppStore";
import type { ProfileSection } from "@/utils/navigation/profilePaths";

export function isValidEmail(value: string): boolean {
  const t = value.trim();
  if (t.length < 5) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export function resolveIsMe(userId: string | undefined, meId: string): boolean {
  return userId === "me" || userId === meId;
}

export function resolveProfileUserId(
  userId: string | undefined,
  meId: string,
  isMe: boolean,
): string {
  return isMe ? meId : (userId ?? meId);
}

export function isProfileNameDirty(draft: string, saved: string): boolean {
  return draft.trim() !== saved.trim();
}

export function isProfileEmailDirty(draft: string, saved: string): boolean {
  return draft.trim().toLowerCase() !== saved.trim().toLowerCase();
}

export function isProfileAvatarDirty(draftUrl: string | null): boolean {
  return draftUrl !== null;
}

export function buildSocialPatchPayload(
  network: SocialNetworkId,
  value: string,
): { instagram?: string; telegram?: string; xAccount?: string } {
  const t = value.trim();
  if (network === "instagram") return { instagram: t };
  if (network === "telegram") return { telegram: t };
  return { xAccount: t };
}

/** Si el visitante no puede ver el tab, devuelve `account`; si no, null. */
export function shouldRedirectProfileTab(
  tab: ProfileSection,
  isMe: boolean,
  storesCount: number,
): ProfileSection | null {
  if (tab === "stores" && storesCount === 0 && !isMe) return "account";
  if ((tab === "reels" || tab === "saved") && !isMe) return "account";
  return null;
}

export function shouldOpenStripeCardsModal(
  searchParams: { get: (key: string) => string | null },
  isMe: boolean,
): boolean {
  return isMe && searchParams.get("stripeCards") === "1";
}
