import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  clearCatalogSearchPersistence,
  waitForCatalogSearchSettled,
} from "./e2e-page-helpers";

type SearchItemJson = {
  kind?: string;
  offer?: { id?: string; title?: string; titulo?: string; name?: string };
};

/** Parses emergent offer id from GET /api/v1/market/stores/search items. */
export function findEmergentOfferIdInSearchItems(
  items: SearchItemJson[] | undefined,
  titulo?: string,
): string | null {
  if (!items?.length) return null;
  const normalizedTitle = titulo?.trim();
  for (const item of items) {
    if (item.kind !== "emergent") continue;
    const id = item.offer?.id?.trim() ?? "";
    if (!id.startsWith("emo_")) continue;
    if (normalizedTitle) {
      const name = (item.offer?.title ?? item.offer?.titulo ?? item.offer?.name ?? "").trim();
      if (name && name !== normalizedTitle) continue;
    }
    return id;
  }
  for (const item of items) {
    const id = item.offer?.id?.trim() ?? "";
    if (item.kind === "emergent" && id.startsWith("emo_")) return id;
  }
  return null;
}

async function setCatalogSearchKindsEmergentOnly(page: Page): Promise<void> {
  await page.getByRole("button", { name: /filtrar por tipo/i }).click();
  for (const name of [/^tiendas$/i, /^productos$/i, /^servicios$/i]) {
    const opt = page.getByRole("option", { name });
    if ((await opt.getAttribute("aria-selected")) === "true") {
      await opt.click();
    }
  }
  const emergent = page.getByRole("option", { name: /^hojas de ruta$/i });
  if ((await emergent.getAttribute("aria-selected")) !== "true") {
    await emergent.click();
  }
  await page.keyboard.press("Escape");
}

/** Resolves `/offer/emo_*` via catalog search UI (tipo = solo hojas de ruta). */
export async function findEmergentOfferUrlViaCatalogSearchUI(
  page: Page,
  titulo: string,
): Promise<string | null> {
  const normalized = titulo.trim();
  if (!normalized) return null;

  await clearCatalogSearchPersistence(page);
  await page.goto("/search", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await setCatalogSearchKindsEmergentOnly(page);
  await page.getByLabel(/buscar en cat[aá]logo/i).fill(normalized);
  await page.getByRole("button", { name: /buscar/i }).click();
  await waitForCatalogSearchSettled(page);

  const cards = page
    .locator("main .vt-card")
    .filter({ has: page.locator("a[href^='/offer/emo_']") });
  const cardCount = await cards.count();
  for (let i = 0; i < cardCount; i++) {
    const card = cards.nth(i);
    const cardText = ((await card.textContent()) ?? "").trim();
    if (!cardText.includes(normalized)) continue;
    const href = (await card.locator("a[href^='/offer/emo_']").first().getAttribute("href"))?.trim() ?? "";
    if (href.startsWith("/offer/emo_")) return href;
  }

  const links = page.locator("main a[href^='/offer/emo_']");
  if ((await links.count()) === 1) {
    const href = (await links.first().getAttribute("href"))?.trim() ?? "";
    if (href.startsWith("/offer/emo_")) return href;
  }

  return null;
}

export async function setCatalogSearchKindsProductsOnly(page: Page): Promise<void> {
  await page.getByRole("button", { name: /filtrar por tipo/i }).click();
  for (const name of [/^tiendas$/i, /^servicios$/i, /^hojas de ruta$/i]) {
    const opt = page.getByRole("option", { name });
    if ((await opt.getAttribute("aria-selected")) === "true") {
      await opt.click();
    }
  }
  const products = page.getByRole("option", { name: /^productos$/i });
  if ((await products.getAttribute("aria-selected")) !== "true") {
    await products.click();
  }
  await page.keyboard.press("Escape");
}

/** Polls autocomplete API until a suggestion contains expectedSubstring. */
export async function waitForAutocompleteApiSuggestion(
  page: Page,
  prefix: string,
  expectedSubstring: string,
  timeoutMs = 60_000,
): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(
          async ([q, needle]) => {
            const res = await fetch(
              `/api/v1/market/stores/autocomplete?q=${encodeURIComponent(q)}&kinds=product&limit=15`,
            );
            if (!res.ok) return false;
            const json = (await res.json()) as { suggestions?: string[] };
            const needleLower = String(needle).toLowerCase();
            return (json.suggestions ?? []).some((s) =>
              s.toLowerCase().includes(needleLower),
            );
          },
          [prefix, expectedSubstring],
        ),
      { timeout: timeoutMs },
    )
    .toBe(true);
}

/** Polls autocomplete listbox until an option contains expectedSubstring. */
export async function waitForAutocompleteSuggestion(
  page: Page,
  prefix: string,
  expectedSubstring: string,
  timeoutMs = 20_000,
): Promise<void> {
  const input = page.getByLabel(/buscar en cat[aá]logo/i);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await input.fill("");
    await input.fill(prefix);
    await page.waitForTimeout(400);
    const option = page
      .getByRole("listbox")
      .getByRole("option")
      .filter({ hasText: expectedSubstring })
      .first();
    if (await option.isVisible().catch(() => false)) {
      await expect(option).toBeVisible();
      return;
    }
    await page.waitForTimeout(1_000);
  }
  throw new Error(
    `Autocomplete option containing "${expectedSubstring}" not found within ${timeoutMs}ms`,
  );
}
