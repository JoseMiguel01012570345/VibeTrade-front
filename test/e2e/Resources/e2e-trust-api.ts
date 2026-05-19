import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Lee el puntaje de confianza visible en la ficha pública de la tienda. */
export async function fetchStoreTrustScore(
  page: Page,
  storeId: string,
): Promise<number> {
  const paths = [`/store/${storeId}/vitrina`, `/store/${storeId}`];
  let trustBlock = page.getByLabel(/confianza de la tienda/i);
  for (const path of paths) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    trustBlock = page.getByLabel(/confianza de la tienda/i);
    if (await trustBlock.isVisible({ timeout: 15_000 }).catch(() => false)) {
      break;
    }
  }
  await expect(trustBlock).toBeVisible({ timeout: 30_000 });
  const text = await trustBlock.getByText(/\d+\s*\/\s*100/).first().textContent();
  const match = text?.match(/(\d+)\s*\/\s*100/);
  if (!match?.[1]) {
    throw new Error(`Could not parse store trust from UI: ${text ?? ""}`);
  }
  return Number(match[1]);
}
