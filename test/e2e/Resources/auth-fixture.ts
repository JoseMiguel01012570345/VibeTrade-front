import { test as base } from "@playwright/test";
import { getE2ESession } from "./env";

export const test = base.extend({
  page: async ({ page }, use) => {
    const session = getE2ESession();
    if (session?.sessionToken) {
      await page.addInitScript((token: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", token);
      }, session.sessionToken);
    }
    await use(page);
  },
});

export { expect } from "@playwright/test";
