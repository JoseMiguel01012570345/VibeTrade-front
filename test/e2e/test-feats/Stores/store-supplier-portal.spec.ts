import { test, expect } from "@playwright/test";

test.describe("Portal Proveedor E2E", () => {
  test("muestra pantalla de acceso en /proveedor sin sesión", async ({ page }) => {
    await page.goto("/proveedor");
    await expect(
      page.getByRole("heading", { name: "Portal de proveedor" }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
