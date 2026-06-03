import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

const FIXTURE_PNG = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "pixel.png",
);

function scopePage(scope: Page | Locator): Page {
  return "page" in scope ? scope.page() : scope;
}

async function pickVtOption(
  scope: Page | Locator,
  ariaLabel: string | RegExp,
  optionLabel: string | RegExp,
): Promise<void> {
  const page = scopePage(scope);
  await scope.getByRole("button", { name: ariaLabel }).click();
  await page.getByRole("option", { name: optionLabel }).click();
}

async function pickVtMultiOption(
  scope: Page | Locator,
  ariaLabel: string | RegExp,
  optionLabel: string,
): Promise<void> {
  const page = scopePage(scope);
  await scope.getByRole("button", { name: ariaLabel }).click();
  await page.getByRole("option", { name: optionLabel }).click();
  await page.keyboard.press("Escape");
}

export async function createStoreViaUI(
  page: Page,
  baseURL: string,
  storeName: string,
): Promise<string> {
  await page.goto(`${baseURL}/profile/me/stores`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /nueva tienda/i }).click();
  const modal = page.getByRole("dialog").filter({
    has: page.locator(".vt-modal-title", { hasText: /^nueva tienda$/i }),
  });
  await expect(modal).toBeVisible({ timeout: 10_000 });

  await modal.getByLabel(/nombre de la tienda/i).fill(storeName);
  await pickVtOption(modal, /añadir categoría/i, "Mercancías");
  await modal
    .getByLabel(/descripción de categorías/i)
    .fill("Catálogo E2E Playwright");
  await modal.getByRole("checkbox", {
    name: /transporte incluido en las ofertas/i,
  }).check();

  await modal.getByRole("button", { name: /^guardar$/i }).click();
  await expect(modal).toBeHidden({ timeout: 20_000 });

  const link = page.getByRole("link", { name: new RegExp(storeName, "i") }).first();
  await expect(link).toBeVisible({ timeout: 15_000 });
  const href = await link.getAttribute("href");
  const match = href?.match(/\/store\/([^/?#]+)/);
  if (!match?.[1]) {
    throw new Error("Could not resolve store id after UI create");
  }
  return match[1];
}

async function fillMinimalProductForm(
  page: Page,
  productName: string,
): Promise<void> {
  const dialog = page.getByRole("dialog").filter({
    has: page.locator(".vt-modal-title", { hasText: /añadir producto/i }),
  });
  await pickVtOption(dialog, /transporte incluido en este producto/i, /no, transporte no incluido/i);
  await pickVtOption(dialog, /categoría del producto/i, "Mercancías");
  await dialog.getByLabel(/nombre del producto/i).fill(productName);
  await dialog.getByLabel(/^precio$/i).fill("100");
  await pickVtOption(dialog, /tipo de moneda del precio/i, "USD");
  await pickVtMultiOption(dialog, /monedas aceptadas para el pago/i, "USD");

  const text = "Texto E2E válido para el formulario.";
  await dialog.getByLabel(/descripción breve/i).fill(text);
  await dialog.getByLabel(/beneficio principal/i).fill(text);
  await dialog.getByLabel(/características técnicas/i).fill(text);
  await dialog.getByLabel(/impuestos, envío o instalación/i).fill("No aplica");
  await dialog.getByLabel(/disponibilidad \/ stock/i).fill(text);
  await dialog.getByLabel(/garantía y devolución/i).fill(text);
  await dialog.getByLabel(/contenido incluido/i).fill(text);
  await dialog.getByLabel(/condiciones de uso/i).fill(text);

  await dialog.locator('input[type="file"]').setInputFiles(FIXTURE_PNG);
  await expect(dialog.getByText("Subiendo…", { exact: true })).toBeHidden({
    timeout: 60_000,
  });
  await expect(dialog.locator("img").first()).toBeVisible({ timeout: 15_000 });
}

export async function addProductViaUI(
  page: Page,
  baseURL: string,
  storeId: string,
  productName: string,
): Promise<string> {
  await page.goto(`${baseURL}/store/${storeId}/products`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /añadir producto/i }).click();
  await expect(
    page.getByRole("dialog").filter({
      has: page.locator(".vt-modal-title", { hasText: /añadir producto/i }),
    }),
  ).toBeVisible({ timeout: 10_000 });

  await fillMinimalProductForm(page, productName);

  const putResponse = page.waitForResponse(
    (r) =>
      r.request().method() === "PUT" &&
      r.url().includes(`/market/stores/${encodeURIComponent(storeId)}/products/`) &&
      r.ok(),
    { timeout: 45_000 },
  );
  await page.getByRole("button", { name: /guardar producto/i }).click();
  const res = await putResponse;
  const match = res.url().match(/\/products\/([^/?]+)/);
  if (!match?.[1]) throw new Error("product id missing from save response URL");
  await expect(page.getByText(productName).first()).toBeVisible({
    timeout: 15_000,
  });
  return match[1];
}

export async function publishCatalogItemViaUI(
  page: Page,
  itemName: string,
): Promise<void> {
  const row = page.locator("li").filter({ hasText: itemName });
  await expect(row).toBeVisible({ timeout: 10_000 });
  const publish = row.getByRole("button", { name: /^publicar$/i });
  if (await publish.isVisible().catch(() => false)) {
    await publish.click();
  }
}

async function fillMinimalServiceForm(
  page: Page,
  serviceType: string,
): Promise<void> {
  const dialog = page.getByRole("dialog").filter({
    has: page.locator(".vt-modal-title", { hasText: /añadir servicio/i }),
  });
  await pickVtOption(dialog, /categoría del servicio/i, "Servicios");
  await dialog.getByLabel(/tipo de servicio/i).fill(serviceType);
  await pickVtMultiOption(dialog, /monedas aceptadas para el pago/i, "USD");

  const text = "Descripción E2E del servicio.";
  await dialog.getByLabel(/descripción del servicio/i).fill(text);
  await dialog.getByLabel(/qué incluye/i).fill(text);
  await dialog.getByLabel(/qué no incluye/i).fill(text);
  await dialog.getByLabel(/qué se entrega/i).fill(text);
  await dialog
    .locator("label")
    .filter({ hasText: /propiedad intelectual/i })
    .locator("textarea")
    .fill(text);
}

export async function addServiceViaUI(
  page: Page,
  baseURL: string,
  storeId: string,
  serviceType: string,
): Promise<string> {
  await page.goto(`${baseURL}/store/${storeId}/services`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /añadir servicio/i }).click();
  await expect(
    page.getByRole("dialog").filter({
      has: page.locator(".vt-modal-title", { hasText: /añadir servicio/i }),
    }),
  ).toBeVisible({ timeout: 10_000 });

  await fillMinimalServiceForm(page, serviceType);

  const putResponse = page.waitForResponse(
    (r) =>
      r.request().method() === "PUT" &&
      r.url().includes(`/market/stores/${encodeURIComponent(storeId)}/services/`) &&
      r.ok(),
    { timeout: 45_000 },
  );
  await page.getByRole("button", { name: /guardar servicio/i }).click();
  const res = await putResponse;
  const match = res.url().match(/\/services\/([^/?]+)/);
  if (!match?.[1]) throw new Error("service id missing from save response URL");
  await expect(page.getByText(serviceType).first()).toBeVisible({
    timeout: 15_000,
  });
  return match[1];
}
