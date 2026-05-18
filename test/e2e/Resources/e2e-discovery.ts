import type { Page } from "@playwright/test";

export function offerIdFromHref(href: string | null): string | null {
  if (!href) return null;
  const match = href.match(/\/offer\/([^#/?]+)/);
  return match?.[1] ?? null;
}

export function storeIdFromUrl(url: string): string | null {
  const match = url.match(/\/store\/([^/#?]+)/);
  return match?.[1] ?? null;
}

/** Env override, else first offer link on /home. */
export async function resolveOfferId(page: Page): Promise<string | null> {
  const fromEnv = process.env.PLAYWRIGHT_E2E_OFFER_ID?.trim();
  if (fromEnv) return fromEnv;

  await page.goto("/home");
  const feed = page.getByLabel(/feed de ofertas por lotes/i);
  await feed.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);

  const href = await page
    .locator('a[href^="/offer/"]')
    .first()
    .getAttribute("href", { timeout: 15_000 })
    .catch(() => null);
  return offerIdFromHref(href);
}

/** Env override, else first recommended store card on /home (navigates and returns id). */
export async function resolveStoreId(page: Page): Promise<string | null> {
  const fromEnv = process.env.PLAYWRIGHT_E2E_STORE_ID?.trim();
  if (fromEnv) return fromEnv;

  await page.goto("/home");
  const link = page.locator('[role="link"]').filter({ hasText: /.+/ }).first();
  await link.click({ timeout: 15_000 });
  await page.waitForURL(/\/store\//, { timeout: 15_000 });
  return storeIdFromUrl(page.url());
}
