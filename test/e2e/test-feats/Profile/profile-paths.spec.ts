import { test, expect } from "../../Resources/auth-fixture";
import { profile } from "../../Resources/selectors";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

/** Paridad E2E con test/test-feats/Profile/profilePaths.test.ts */
test.describe("profilePaths E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("recognizes profile sections and canonical paths load", async ({
    page,
  }) => {
    await page.goto("/profile/me/account", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(profile.accountSettings)).toBeVisible({
      timeout: 20_000,
    });

    await page.goto("/profile/me/saved", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(profile.savedOffersHeading)).toBeVisible({
      timeout: 15_000,
    });

  });
});
