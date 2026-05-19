import { test as base } from "@playwright/test";
import { getE2ESellerSession, getE2EToken } from "./env";

/** Vendedor provisionado por global-setup (o PLAYWRIGHT_E2E_SELLER_TOKEN). */
export const sellerTest = base.extend({
  page: async ({ page }, use) => {
    const session = getE2ESellerSession();
    const token = session?.sessionToken ?? getE2EToken();
    if (token) {
      await page.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, token);
    }
    await use(page);
  },
});

export { expect } from "@playwright/test";
