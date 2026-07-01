import { test as base } from "@playwright/test";
import { getE2ESession } from "./env";

/** Comprador: sesión en session.json (global-setup). */
const E2E_CANVAS_STUB = () => {
  HTMLCanvasElement.prototype.toDataURL = function toDataURL() {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  };
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(E2E_CANVAS_STUB);
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
