import { test, expect } from "../../Resources/auth-fixture";
import {
  openAccountPage,
  profileFieldInput,
  saveButtonForField,
} from "../../Resources/e2e-profile-helpers";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

/** Paridad E2E con test/test-feats/Profile/profileAccount.identity.test.tsx */
test.describe("profileAccount identity E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("disables name save when unchanged", async ({ page }) => {
    await openAccountPage(page);
    await expect(saveButtonForField(page, /nombre/i)).toBeDisabled();
  });

  test("saves name when changed", async ({ page }) => {
    await openAccountPage(page);
    const name = `E2E User ${Date.now().toString(36).slice(-6)}`;
    await profileFieldInput(page, /\bnombre\b/i).fill(name);
    const save = saveButtonForField(page, /nombre/i);
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText(/nombre guardado/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(profileFieldInput(page, /\bnombre\b/i)).toHaveValue(name);
  });

  test("rejects invalid email without saving", async ({ page }) => {
    await openAccountPage(page);
    await profileFieldInput(page, /email/i).fill("no-es-email");
    await saveButtonForField(page, /email/i).click();
    await expect(page.getByText(/email válido/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("avatar save stays disabled without draft upload", async ({ page }) => {
    await openAccountPage(page);
    await expect(
      page.getByRole("button", { name: /guardar foto/i }),
    ).toBeDisabled();
  });
});
