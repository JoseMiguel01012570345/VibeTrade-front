import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { profile } from "./selectors";

export async function openAccountPage(page: Page): Promise<void> {
  await page.goto("/profile/me/account", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await expect(page).toHaveURL(/\/profile\/me\/account/, { timeout: 15_000 });
  const settings = page.getByText(profile.accountSettings);
  if (!(await settings.isVisible().catch(() => false))) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
  }
  await expect(settings).toBeVisible({ timeout: 30_000 });
}

export async function openContactsModal(page: Page): Promise<void> {
  await page.getByRole("button", { name: profile.contactsButton }).click();
  await expect(
    page.getByRole("dialog", { name: profile.contactsDialog }),
  ).toBeVisible({ timeout: 10_000 });
}

export function profileFieldInput(page: Page, fieldLabel: RegExp) {
  let labels = page.locator("label").filter({ hasText: fieldLabel });
  if (/nombre/i.test(fieldLabel.source) && !/usuario/i.test(fieldLabel.source)) {
    labels = labels.filter({ hasNotText: /nombre de usuario/i });
  }
  return labels.locator("input.vt-input").first();
}

/** Guardar junto al campo cuyo label coincide (nombre, email, …). */
export function saveButtonForField(page: Page, fieldLabel: RegExp) {
  let labels = page.locator("label").filter({ hasText: fieldLabel });
  if (/nombre/i.test(fieldLabel.source) && !/usuario/i.test(fieldLabel.source)) {
    labels = labels.filter({ hasNotText: /nombre de usuario/i });
  }
  return labels.getByRole("button", { name: /^guardar$/i });
}

export async function addContactByPhone(
  page: Page,
  phone: string,
): Promise<void> {
  await openContactsModal(page);
  await page.getByPlaceholder(/\+54 9 11/i).fill(phone);
  await page.getByRole("button", { name: /^añadir$/i }).click();
  await expect(
    page.getByText(/añadido|contacto/i).first(),
  ).toBeVisible({ timeout: 20_000 });
}

export async function removeContactByDisplayName(
  page: Page,
  displayName: string,
): Promise<void> {
  const row = page.locator("li").filter({ hasText: displayName });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.getByRole("button", { name: /eliminar contacto/i }).click();
  await expect(row).toBeHidden({ timeout: 15_000 });
}

export async function uploadProfileAvatarViaUI(
  page: Page,
  fixturePath: string,
): Promise<void> {
  await page.getByLabel(/subir foto de perfil/i).setInputFiles(fixturePath);
  await expect(
    page.getByRole("button", { name: /guardar foto/i }),
  ).toBeEnabled({ timeout: 30_000 });
}
