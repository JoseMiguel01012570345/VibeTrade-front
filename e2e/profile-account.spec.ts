import { expect, test } from "@playwright/test";

/**
 * E2E de perfil / cuenta. Requiere stack completo:
 * - `npm run dev` (o PLAYWRIGHT_SKIP_WEBSERVER=1 si ya corre)
 * - API en :5110 con usuario de prueba
 * - PLAYWRIGHT_E2E=1
 * - PLAYWRIGHT_E2E_TOKEN con JWT/session válido (mismo valor que sessionStorage vt_session_token)
 *
 * Navegador: `PLAYWRIGHT_CHANNEL=chrome` si `playwright install` no está disponible en tu región.
 */
const e2eEnabled = process.env.PLAYWRIGHT_E2E === "1";
const e2eToken = process.env.PLAYWRIGHT_E2E_TOKEN?.trim() ?? "";

test.describe("profile /account E2E", () => {
  test.skip(!e2eEnabled || !e2eToken, "Set PLAYWRIGHT_E2E=1 and PLAYWRIGHT_E2E_TOKEN");

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", token);
    }, e2eToken);
  });

  test("owner can open account and see settings", async ({ page }) => {
    await page.goto("/profile/me/account");
    await expect(page.getByText(/configuración del usuario/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /contactos/i })).toBeVisible();
  });

  test("opens contacts modal and shows empty or list state", async ({ page }) => {
    await page.goto("/profile/me/account");
    await page.getByRole("button", { name: /contactos/i }).click();
    await expect(page.getByRole("dialog", { name: /^contactos$/i })).toBeVisible();
    await expect(
      page.getByText(/todavía no tienes contactos|número de teléfono/i),
    ).toBeVisible();
  });

  test("stripeCards query opens payment modal", async ({ page }) => {
    await page.goto("/profile/me/account?stripeCards=1");
    await expect(
      page.getByRole("dialog", { name: /pagos \(demo\)/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/stripeCards=1/);
  });
});
