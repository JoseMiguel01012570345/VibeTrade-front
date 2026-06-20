import { test, expect } from "../../Resources/auth-fixture";
import {
  openAccountPage,
  openContactsModal,
  addContactByPhone,
  removeContactByDisplayName,
} from "../../Resources/e2e-profile-helpers";
import {
  getE2ESellerSession,
  isE2EReady,
  e2eSkipReason,
} from "../../Resources/env";
import {
  chatE2ESkipReason,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";

/** Paridad E2E con ContactsIntegrationTests — add by phone, list, remove. */
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

  test.describe("registered contact lifecycle", () => {
    test.skip(!hasDistinctSellerSession(), chatE2ESkipReason);

    test("adds seller as contact and lists it", async ({ page }) => {
      const seller = getE2ESellerSession()!;
      expect(seller.phone?.trim().length).toBeGreaterThan(5);

      await openAccountPage(page);
      await addContactByPhone(page, seller.phone);

      const dialog = page.getByRole("dialog", { name: /^contactos$/i });
      await expect(dialog.getByRole("link").first()).toBeVisible({
        timeout: 10_000,
      });
    });

    test("removes contact from list", async ({ page }) => {
      const seller = getE2ESellerSession()!;
      await openAccountPage(page);
      await openContactsModal(page);

      const existing = page.locator("li").filter({ has: page.getByRole("link") });
      if ((await existing.count()) === 0) {
        await page.getByPlaceholder(/\+54 9 11/i).fill(seller.phone);
        await page.getByRole("button", { name: /^añadir$/i }).click();
        await expect(
          page.getByText(/añadido|contacto/i).first(),
        ).toBeVisible({ timeout: 20_000 });
      }

      const contactLink = page.getByRole("dialog").getByRole("link").first();
      const name = ((await contactLink.textContent()) ?? "").trim();
      expect(name.length).toBeGreaterThan(0);

      await removeContactByDisplayName(page, name);
      await expect(
        page.getByText(/todavía no tienes contactos/i),
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
