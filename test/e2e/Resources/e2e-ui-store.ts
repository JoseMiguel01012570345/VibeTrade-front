import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { FIXTURE_PNG } from "./e2e-fixtures";

function rootPage(scope: Page | Locator): Page {
  return "page" in scope ? scope.page() : scope;
}

async function pickVtOption(
  scope: Page | Locator,
  ariaLabel: string | RegExp,
  optionLabel: string | RegExp,
): Promise<void> {
  const page = rootPage(scope);
  await scope.getByRole("button", { name: ariaLabel }).click();
  await page.getByRole("option", { name: optionLabel }).click();
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

export type ProductFormOpts = {
  price?: string;
  priceCurrency?: "USD" | "EUR";
  acceptedCurrencies?: ("USD" | "EUR")[];
};

async function fillMinimalProductForm(
  page: Page,
  productName: string,
  opts: ProductFormOpts = {},
): Promise<void> {
  const price = opts.price ?? "100";
  const priceCurrency = opts.priceCurrency ?? "USD";

  const dialog = page.getByRole("dialog").filter({
    has: page.locator(".vt-modal-title", { hasText: /añadir producto/i }),
  });
  await pickVtOption(dialog, /transporte incluido en este producto/i, /no, transporte no incluido/i);
  await pickVtOption(dialog, /categoría del producto/i, "Mercancías");
  await dialog.getByLabel(/nombre del producto/i).fill(productName);
  await dialog.getByLabel(/^precio$/i).fill(price);
  await pickVtOption(dialog, /tipo de moneda del precio/i, priceCurrency);

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
  formOpts: ProductFormOpts = {},
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

  await fillMinimalProductForm(page, productName, formOpts);

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
  await page.goto(`${baseURL}/store/${storeId}/products`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText(/cargando tienda/i)).toBeHidden({ timeout: 45_000 });
  await expect(page.getByText(productName).first()).toBeVisible({
    timeout: 30_000,
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

const SERVICE_TRANSPORT_HINT =
  /transporte|logística|logistica|flete|transport|cadena|fulfillment|última milla|picking|envío|almacenaje/i;

function serviceTypeQualifiesAsTransport(serviceType: string): boolean {
  return SERVICE_TRANSPORT_HINT.test(serviceType);
}

export type ServiceFormOpts = {
  acceptedCurrencies?: ("USD" | "EUR")[];
  /** Tras guardar, reescribe monedas vía PUT (p. ej. USD+EUR cuando la UI solo permite una). */
  monedasAfterSave?: string[];
};

async function fillMinimalServiceForm(
  page: Page,
  serviceType: string,
  opts: ServiceFormOpts = {},
): Promise<void> {
  const acceptedCurrency = (opts.acceptedCurrencies ?? ["USD"])[0]!;
  const dialog = page.getByRole("dialog").filter({
    has: page.locator(".vt-modal-title", { hasText: /añadir servicio/i }),
  });
  await pickVtOption(dialog, /categoría del servicio/i, "Servicios");
  await dialog.getByLabel(/tipo de servicio/i).fill(serviceType);
  await pickVtOption(dialog, /moneda aceptada para el pago/i, acceptedCurrency);

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

  if (serviceTypeQualifiesAsTransport(serviceType)) {
    await dialog.locator('input[type="file"]').setInputFiles(FIXTURE_PNG);
    await expect(dialog.getByText("Subiendo…", { exact: true })).toBeHidden({
      timeout: 60_000,
    });
    await expect(dialog.locator("img").first()).toBeVisible({ timeout: 15_000 });
  }
}

export async function addServiceViaUI(
  page: Page,
  baseURL: string,
  storeId: string,
  serviceType: string,
  formOpts: ServiceFormOpts = {},
  sessionToken?: string,
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

  await fillMinimalServiceForm(page, serviceType, formOpts);

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
  const serviceId = match[1];

  if (formOpts.monedasAfterSave?.length && sessionToken) {
    const savedBody = res.request().postDataJSON() as Record<string, unknown>;
    const putRes = await page.request.put(res.url(), {
      headers: { Authorization: `Bearer ${sessionToken}` },
      data: { ...savedBody, monedas: formOpts.monedasAfterSave },
    });
    if (!putRes.ok()) {
      throw new Error(`PUT service monedas after save failed: ${putRes.status()}`);
    }
  }

  await page.goto(`${baseURL}/store/${storeId}/services`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText(serviceType).first()).toBeVisible({
    timeout: 15_000,
  });
  return serviceId;
}

export async function editProductNameViaUI(
  page: Page,
  baseURL: string,
  storeId: string,
  productName: string,
  newName: string,
): Promise<void> {
  await page.goto(`${baseURL}/store/${storeId}/products`, {
    waitUntil: "domcontentloaded",
  });
  const row = page.locator("li").filter({ hasText: productName });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole("button", { name: /^editar$/i }).click();
  const dialog = page.getByRole("dialog").filter({
    has: page.locator(".vt-modal-title", { hasText: /editar producto/i }),
  });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.getByLabel(/nombre del producto/i).fill(newName);
  const putResponse = page.waitForResponse(
    (r) =>
      r.request().method() === "PUT" &&
      r.url().includes(`/market/stores/${encodeURIComponent(storeId)}/products/`) &&
      r.ok(),
    { timeout: 45_000 },
  );
  await dialog.getByRole("button", { name: /guardar producto/i }).click();
  await putResponse;
  await expect(page.getByText(newName).first()).toBeVisible({ timeout: 15_000 });
}

export async function deleteProductViaUI(
  page: Page,
  baseURL: string,
  storeId: string,
  productName: string,
): Promise<void> {
  await page.goto(`${baseURL}/store/${storeId}/products`, {
    waitUntil: "domcontentloaded",
  });
  const row = page.locator("li").filter({ hasText: productName });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole("button", { name: /^quitar$/i }).click();
  const modal = page.getByRole("dialog").filter({
    hasText: /eliminar producto/i,
  });
  await expect(modal).toBeVisible({ timeout: 8_000 });
  const delResponse = page.waitForResponse(
    (r) =>
      r.request().method() === "DELETE" &&
      r.url().includes("/products/") &&
      (r.ok() || r.status() === 204),
    { timeout: 30_000 },
  );
  await modal.getByRole("button", { name: /^eliminar$/i }).click();
  await delResponse;
  await expect(row).toBeHidden({ timeout: 15_000 });
}

export async function deleteStoreViaUI(
  page: Page,
  baseURL: string,
  storeName: string,
): Promise<void> {
  await page.goto(`${baseURL}/profile/me/stores`, {
    waitUntil: "domcontentloaded",
  });
  const card = page.locator("li, article, [class*='card']").filter({
    hasText: storeName,
  }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole("button", { name: /^eliminar$/i }).click();
  const modal = page.getByRole("dialog").filter({
    hasText: /eliminar la tienda/i,
  });
  await expect(modal).toBeVisible({ timeout: 8_000 });
  await modal.getByRole("button", { name: /^eliminar$/i }).click();
  await expect(page.getByText(/tienda eliminada/i).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(card).toBeHidden({ timeout: 15_000 });
}
