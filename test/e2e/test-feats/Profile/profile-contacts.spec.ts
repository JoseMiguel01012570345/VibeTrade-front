import { test, expect } from "../../Resources/auth-fixture";
import {
  openAccountPage,
  openContactsModal,
} from "../../Resources/e2e-profile-helpers";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

/** Paridad E2E con test/test-feats/Profile/contactsModal.test.tsx */
test.describe("ContactsModal E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("loads contacts when opened and shows empty or list state", async ({
    page,
  }) => {
    await openAccountPage(page);
    await openContactsModal(page);
    await expect(
      page
        .getByText(/todavía no tienes contactos|número de teléfono/i)
        .first(),
    ).toBeVisible();
  });

  test("adds a contact by phone", async ({ page }) => {
    await openAccountPage(page);
    await openContactsModal(page);
    await page.getByPlaceholder(/\+54 9 11/i).fill("+5491199997777");
    await page.getByRole("button", { name: /^añadir$/i }).click();
    await expect(
      page
        .getByText(/contacto|usuario|añadido|no registrado|error/i)
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
