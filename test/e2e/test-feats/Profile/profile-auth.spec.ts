import { test, expect } from "@playwright/test";
import {
  loginUserViaUI,
  logoutViaUI,
  readE2ESessionFromPage,
  registerUserViaUI,
} from "../../Resources/e2e-ui-auth";
import {
  openAccountPage,
  uploadProfileAvatarViaUI,
} from "../../Resources/e2e-profile-helpers";
import { FIXTURE_PNG } from "../../Resources/e2e-fixtures";
import { profile } from "../../Resources/selectors";

/** Paridad E2E con AuthAndProfileIntegrationTests — sesión aislada. */
test.describe.configure({ mode: "serial", timeout: 120_000 });

test.describe("profile auth E2E", () => {
  let registeredPhone = "";

  test("register creates active session and profile page loads", async ({
    page,
    baseURL,
  }) => {
    const session = await registerUserViaUI(page, baseURL!);
    registeredPhone = session.phone;
    expect(session.sessionToken.length).toBeGreaterThan(10);
    expect(session.userId.length).toBeGreaterThan(0);

    const roundtrip = await readE2ESessionFromPage(page);
    expect(roundtrip.sessionToken).toBe(session.sessionToken);

    await openAccountPage(page);
    await expect(page.getByText(profile.accountSettings)).toBeVisible();
  });

  test("login succeeds for existing registered user", async ({
    page,
    baseURL,
  }) => {
    test.skip(!registeredPhone, "register test must run first");

    await logoutViaUI(page, baseURL!);
    const session = await loginUserViaUI(page, baseURL!, registeredPhone);
    expect(session.sessionToken.length).toBeGreaterThan(10);
    await expect(page).toHaveURL(/\/home/, { timeout: 45_000 });

    const active = await page.evaluate(
      () => sessionStorage.getItem("vt_session_active") === "1",
    );
    expect(active).toBe(true);
  });

  test("uploads avatar and saves profile photo", async ({ page, baseURL }) => {
    await registerUserViaUI(page, baseURL!);
    await openAccountPage(page);

    await uploadProfileAvatarViaUI(page, FIXTURE_PNG);
    await page.getByRole("button", { name: /guardar foto/i }).click();
    await expect(
      page.getByText(/foto de perfil guardada/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      page.getByRole("button", { name: /ver foto de perfil/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
