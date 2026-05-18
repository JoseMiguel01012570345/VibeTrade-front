import { test as base } from "@playwright/test";
import { e2eToken, isE2EReady } from "./env";

export const test = base.extend({
  page: async ({ page }, use) => {
    if (isE2EReady()) {
      await page.addInitScript((token: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", token);
      }, e2eToken);
    }
    await use(page);
  },
});

export { expect } from "@playwright/test";
