import { sellerTest, expect } from "../../Resources/seller-auth-fixture";
import { profile } from "../../Resources/selectors";
import {
  chatE2EReady,
  chatE2ESkipReason,
  chatE2ESellerSkipReason,
  getE2EScenario,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";

/** Paridad E2E con storeFormModal, profileStoresSection.*, profileStoreFormValidation. */
sellerTest.describe("profile stores CRUD E2E", () => {
  sellerTest.skip(!chatE2EReady(), chatE2ESkipReason);
  sellerTest.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  sellerTest("blocks save when store name is empty", async ({ page }) => {
    await page.goto("/profile/me/stores");
    await page.getByRole("button", { name: profile.newStoreButton }).click();
    const modal = page.getByRole("dialog").filter({
      has: page.locator(".vt-modal-title", { hasText: /^nueva tienda$/i }),
    });
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await modal.getByRole("button", { name: /^guardar$/i }).click();
    await expect(page.getByText(/nombre|obligatorio|completa/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(modal).toBeVisible();
  });

  sellerTest("creates store with valid values", async ({ page }) => {
    const name = `Tienda E2E CRUD ${Date.now().toString(36)}`;
    await page.goto("/profile/me/stores");
    await page.getByRole("button", { name: profile.newStoreButton }).click();
    const modal = page.getByRole("dialog").filter({
      has: page.locator(".vt-modal-title", { hasText: /^nueva tienda$/i }),
    });
    await modal.getByLabel(/nombre de la tienda/i).fill(name);
    await modal.getByRole("button", { name: /añadir categoría/i }).click();
    await page.getByRole("option", { name: /mercancías/i }).click();
    await modal
      .getByLabel(/descripción de categorías/i)
      .fill("Descripción E2E con más de diez caracteres.");
    await modal.getByRole("button", { name: /^guardar$/i }).click();
    await expect(modal).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  });

  sellerTest("filters stores by name", async ({ page }) => {
    await page.goto("/profile/me/stores");
    const storeLink = page.getByRole("link", { name: /^abrir tienda /i }).first();
    await expect(storeLink).toBeVisible({ timeout: 15_000 });
    const ariaLabel = (await storeLink.getAttribute("aria-label")) ?? "";
    const name = ariaLabel.replace(/^abrir tienda\s+/i, "").trim();
    expect(name.length).toBeGreaterThanOrEqual(3);
    const filter = page.getByLabel(/filtrar tiendas por nombre/i);
    const query = name.slice(0, Math.min(12, name.length));
    await filter.fill(query);
    await expect(storeLink).toBeVisible();
    await filter.fill("zzzz-no-match-zzzz");
    await expect(
      page.getByText(/ninguna tienda coincide con el filtro/i),
    ).toBeVisible({ timeout: 15_000 });
    await expect(storeLink).toBeHidden({ timeout: 5_000 });
  });

  sellerTest("updates store name from edit modal", async ({ page }) => {
    const scenario = getE2EScenario()!;
    await page.goto("/profile/me/stores");
    const card = page.locator("li, article, [class*='card']").filter({
      hasText: /tienda e2e/i,
    }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.getByRole("button", { name: /editar datos/i }).first().click();
    const modal = page.getByRole("dialog").filter({
      has: page.locator(".vt-modal-title", { hasText: /editar|tienda/i }),
    });
    const renamed = `Renombrada ${Date.now().toString(36).slice(-5)}`;
    await modal.getByLabel(/nombre de la tienda/i).fill(renamed);
    await modal.getByRole("button", { name: /^guardar$/i }).click();
    await expect(page.getByText(renamed).first()).toBeVisible({ timeout: 20_000 });
    void scenario;
  });
});
