import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { profile } from "./selectors";

export async function openAccountPage(page: Page): Promise<void> {
  await page.goto("/profile/me/account", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(profile.accountSettings)).toBeVisible({
    timeout: 20_000,
  });
}

export async function openContactsModal(page: Page): Promise<void> {
  await page.getByRole("button", { name: profile.contactsButton }).click();
  await expect(
    page.getByRole("dialog", { name: profile.contactsDialog }),
  ).toBeVisible({ timeout: 10_000 });
}

export function profileFieldInput(page: Page, fieldLabel: RegExp) {
  return page
    .locator("label")
    .filter({ hasText: fieldLabel })
    .locator("input.vt-input")
    .first();
}

/** Guardar junto al campo cuyo label coincide (nombre, email, …). */
export function saveButtonForField(page: Page, fieldLabel: RegExp) {
  return page
    .locator("label")
    .filter({ hasText: fieldLabel })
    .getByRole("button", { name: /^guardar$/i });
}
