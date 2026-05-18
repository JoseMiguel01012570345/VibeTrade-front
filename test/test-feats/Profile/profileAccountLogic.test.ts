import { describe, expect, it } from "vitest";
import {
  buildSocialPatchPayload,
  isProfileAvatarDirty,
  isProfileEmailDirty,
  isProfileNameDirty,
  isValidEmail,
  resolveIsMe,
  resolveProfileUserId,
  shouldOpenStripeCardsModal,
  shouldRedirectProfileTab,
} from "@features/profile/profileAccountLogic";

describe("profileAccountLogic", () => {
  it("validates email", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("bad")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("resolves isMe and profile user id", () => {
    expect(resolveIsMe("me", "u1")).toBe(true);
    expect(resolveIsMe("u1", "u1")).toBe(true);
    expect(resolveIsMe("other", "u1")).toBe(false);
    expect(resolveProfileUserId("other", "u1", false)).toBe("other");
    expect(resolveProfileUserId("me", "u1", true)).toBe("u1");
  });

  it("tracks dirty fields", () => {
    expect(isProfileNameDirty(" Ana ", "Ana")).toBe(false);
    expect(isProfileNameDirty("Ana B", "Ana")).toBe(true);
    expect(isProfileEmailDirty("A@B.COM", "a@b.com")).toBe(false);
    expect(isProfileEmailDirty("x@y.com", "a@b.com")).toBe(true);
    expect(isProfileAvatarDirty(null)).toBe(false);
    expect(isProfileAvatarDirty("/api/v1/media/x")).toBe(true);
  });

  it("builds social patch payload", () => {
    expect(buildSocialPatchPayload("instagram", "@a")).toEqual({
      instagram: "@a",
    });
    expect(buildSocialPatchPayload("x", "@x")).toEqual({ xAccount: "@x" });
  });

  it("redirects visitor-only tabs", () => {
    expect(shouldRedirectProfileTab("reels", false, 0)).toBe("account");
    expect(shouldRedirectProfileTab("saved", false, 0)).toBe("account");
    expect(shouldRedirectProfileTab("stores", false, 0)).toBe("account");
    expect(shouldRedirectProfileTab("stores", false, 2)).toBe(null);
    expect(shouldRedirectProfileTab("reels", true, 0)).toBe(null);
  });

  it("opens stripe cards from query when owner", () => {
    const params = new URLSearchParams("stripeCards=1");
    expect(shouldOpenStripeCardsModal(params, true)).toBe(true);
    expect(shouldOpenStripeCardsModal(params, false)).toBe(false);
    expect(
      shouldOpenStripeCardsModal(new URLSearchParams(), true),
    ).toBe(false);
  });
});
