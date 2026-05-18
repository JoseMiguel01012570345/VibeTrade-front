import { test, expect } from "../../Resources/auth-fixture";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";
import { profile } from "../../Resources/selectors";

test.describe("profile stores E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("owner sees stores section and new store action", async ({ page }) => {
    await page.goto("/profile/me/stores");
    await expect(
      page.getByRole("button", { name: profile.newStoreButton }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
