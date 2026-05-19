import { test, expect } from "../../Resources/auth-fixture";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";
import { profile } from "../../Resources/selectors";

test.describe("profile /account E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("owner can open account and see settings", async ({ page }) => {
    await page.goto("/profile/me/account", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(profile.accountSettings)).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole("button", { name: profile.contactsButton }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("opens contacts modal and shows empty or list state", async ({
    page,
  }) => {
    await page.goto("/profile/me/account", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: profile.contactsButton }).click();
    await expect(
      page.getByRole("dialog", { name: profile.contactsDialog }),
    ).toBeVisible();
    await expect(
      page.getByText(/todavía no tienes contactos|número de teléfono/i).first(),
    ).toBeVisible();
  });

  test("stripeCards query opens payment modal", async ({ page }) => {
    await page.goto("/profile/me/account?stripeCards=1");
    await expect(
      page.getByRole("dialog", { name: /pagos \(demo\)/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/stripeCards=1/);
  });
});
