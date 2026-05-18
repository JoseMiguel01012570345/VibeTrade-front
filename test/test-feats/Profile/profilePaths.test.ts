import { describe, expect, it } from "vitest";
import { isProfileSection, profileSectionPath } from "@/utils/navigation/profilePaths";

describe("profilePaths", () => {
  it("recognizes profile sections", () => {
    expect(isProfileSection("account")).toBe(true);
    expect(isProfileSection("reels")).toBe(true);
    expect(isProfileSection("nope")).toBe(false);
  });

  it("builds canonical paths", () => {
    expect(profileSectionPath("me", "account")).toBe("/profile/me/account");
    expect(profileSectionPath("user-1", "stores")).toBe(
      "/profile/user-1/stores",
    );
  });
});
