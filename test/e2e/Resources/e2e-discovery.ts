import type { Page } from "@playwright/test";
import { getE2EOfferId, getE2EStoreId } from "./env";
import { waitForHomeFeedReady } from "./e2e-page-helpers";

export function offerIdFromHref(href: string | null): string | null {
  if (!href) return null;
  const match = href.match(/\/offer\/([^#/?]+)/);
  return match?.[1] ?? null;
}

export function storeIdFromUrl(url: string): string | null {
  const match = url.match(/\/store\/([^/#?]+)/);
  return match?.[1] ?? null;
}

/** global-setup scenario / env override, else first offer link on /home. */
export async function resolveOfferId(page: Page): Promise<string | null> {
  const fromSetup = getE2EOfferId();
  if (fromSetup) return fromSetup;

  await page.goto("/home", { waitUntil: "domcontentloaded" });
  const feed = page.getByLabel(/feed de ofertas por lotes/i);
  await feed.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);

  const href = await page
    .locator('a[href^="/offer/"]')
    .first()
    .getAttribute("href", { timeout: 15_000 })
    .catch(() => null);
  return offerIdFromHref(href);
}

/** Env / global-setup override, else first recommended store card on /home. */
export async function resolveStoreId(page: Page): Promise<string | null> {
  const fromSetup = getE2EStoreId();
  if (fromSetup) return fromSetup;

  await page.goto("/home", { waitUntil: "domcontentloaded" });
  await waitForHomeFeedReady(page);
  const storeCard = page
    .getByRole("list", { name: /tiendas recomendadas/i })
    .getByRole("link")
    .first();
  await storeCard.scrollIntoViewIfNeeded();
  await storeCard.click({ noWaitAfter: true, timeout: 15_000 });
  await page.waitForURL(/\/store\//, { timeout: 20_000 });
  return storeIdFromUrl(page.url());
}
