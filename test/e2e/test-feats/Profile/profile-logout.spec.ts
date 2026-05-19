import { test, expect } from "@playwright/test";
import { registerUserViaUI } from "../../Resources/e2e-ui-auth";
import { openAccountPage } from "../../Resources/e2e-profile-helpers";
import { profile } from "../../Resources/selectors";

/** Paridad E2E con profileAccount.actions — sesión aislada (no invalida el token global). */
test.describe.configure({ mode: "serial", timeout: 120_000 });

test.describe("profileAccount actions E2E", () => {
  test("confirms logout and navigates to onboarding", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    await registerUserViaUI(page, baseURL!);
    await openAccountPage(page);
    await page.getByRole("button", { name: profile.logoutButton }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: profile.logoutConfirm })
      .click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 });
  });

  test("cancels logout and stays on account", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await registerUserViaUI(page, baseURL!);
    await openAccountPage(page);
    await page.getByRole("button", { name: profile.logoutButton }).click();
    await page.getByRole("button", { name: /^cancelar$/i }).click();
    await expect(page).toHaveURL(/\/profile\/me\/account/);
    await expect(page.getByText(profile.accountSettings)).toBeVisible();
  });
});
