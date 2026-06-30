import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { E2ESession } from "./e2e-session";
import { getE2EApiBaseUrl } from "./e2e-api-base";

function randomNationalNumber(): string {
  const n = Math.floor(100_000_000 + Math.random() * 899_999_999);
  return String(n);
}

export function randomE2EPhone(): string {
  return `+549${randomNationalNumber()}`;
}

export function randomE2EEmail(): string {
  return `e2e${Math.floor(Math.random() * 900000 + 100000)}@test.local`;
}

export function randomE2EUsername(): string {
  return `user_${Math.floor(Math.random() * 900000 + 100000)}`;
}

export const E2E_TEST_PASSWORD = "TestPass123!";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Backend must respond before React mounts (main.tsx awaits bootstrap/guest). */
export async function isE2EApiReachable(baseURL?: string): Promise<boolean> {
  const origin = (baseURL ?? getE2EApiBaseUrl()).replace(/\/$/, "");
  const url = `${origin}/api/v1/bootstrap/guest?${new URLSearchParams({
    guestId: "e2e-probe",
  }).toString()}`;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await sleep(2_500);
  }
  return false;
}

export async function isE2EAppReachable(
  page: Page,
  baseURL: string,
): Promise<boolean> {
  let lastError = "unknown";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.goto(`${baseURL}/onboarding`, {
        waitUntil: "load",
        timeout: 60_000,
      });
      await expect(
        page.getByRole("heading", { name: /bienvenido a vibetrade/i }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByRole("button", { name: /crear una cuenta nueva/i }),
      ).toBeVisible({ timeout: 15_000 });
      return true;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await sleep(3_000);
    }
  }
  console.warn(`[e2e] UI reachability failed after retries: ${lastError}`);
  return false;
}

/** Waits for Vite (:5173) and API (:5110 via proxy). Returns a human-readable failure reason. */
export async function waitForE2EStackReady(
  page: Page,
  baseURL: string,
): Promise<string | null> {
  if (!(await isE2EApiReachable())) {
    return (
      "Backend API not reachable at /api/v1/bootstrap/guest — start the API on :5110 " +
      "(docker compose up or dotnet run). The frontend will not render onboarding until bootstrap succeeds."
    );
  }
  if (!(await isE2EAppReachable(page, baseURL))) {
    return (
      `Frontend UI not ready at ${baseURL}/onboarding — is Vite running on :5173? ` +
      "First compile after startup can take ~60s; retry once dev is fully warm."
    );
  }
  return null;
}

async function readDevOtpCode(page: Page): Promise<string> {
  const devCode = page.locator("div:has-text('Dev:') span.font-black");
  await expect(devCode).toBeVisible({ timeout: 15_000 });
  const text = ((await devCode.textContent()) ?? "").trim();
  if (!/^\d{4,8}$/.test(text)) {
    throw new Error(
      `OTP dev hint not visible (got "${text}"); run API with Auth:ExposeDevCodes=true`,
    );
  }
  return text;
}

async function submitOtp(page: Page, code: string): Promise<void> {
  const inputs = page.getByLabel("Código de verificación").locator("input");
  await expect(inputs.first()).toBeVisible({ timeout: 10_000 });
  const digits = code.replace(/\D/g, "");
  await inputs.first().click();
  await inputs.first().pressSequentially(digits, { delay: 80 });
  const continuar = page.getByRole("button", {
    name: /continuar|completar registro|confirmar/i,
  });
  if (await continuar.isEnabled({ timeout: 2_000 }).catch(() => false)) {
    await continuar.click();
  }
}

async function fillRegisterForm(
  page: Page,
  email: string,
  password: string,
  username: string,
  phoneDigits: string,
): Promise<void> {
  await expect(page.getByRole("heading", { name: /crear cuenta/i })).toBeVisible({
    timeout: 15_000,
  });

  const form = page.locator("form").first();
  const phoneInput = form.locator('input[inputmode="tel"]');
  await expect(phoneInput).toBeEnabled({ timeout: 30_000 });
  await phoneInput.fill(phoneDigits);
  await form.locator("label").filter({ hasText: "Usuario" }).locator("input").fill(username);
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[autocomplete="new-password"]').first().fill(password);
  await form.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await form.getByRole("button", { name: /^continuar$/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/verify-phone/, { timeout: 20_000 });
}

export async function readE2ESessionFromPage(page: Page): Promise<E2ESession> {
  const session = await page.evaluate(() => ({
    sessionToken: sessionStorage.getItem("vt_session_token") ?? "",
    sessionActive: sessionStorage.getItem("vt_session_active"),
  }));
  if (!session.sessionToken || session.sessionActive !== "1") {
    throw new Error("UI session not active after login");
  }

  const userId = await page.evaluate(async () => {
    const token = sessionStorage.getItem("vt_session_token");
    if (!token) return "";
    const res = await fetch("/api/v1/auth/session", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return "";
    const json = (await res.json()) as { user?: { id?: string; phone?: string } };
    return json.user?.id?.trim() ?? "";
  });

  const phone = await page.evaluate(async () => {
    const token = sessionStorage.getItem("vt_session_token");
    if (!token) return "";
    const res = await fetch("/api/v1/auth/session", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return "";
    const json = (await res.json()) as { user?: { phone?: string } };
    return json.user?.phone?.trim() ?? "";
  });

  return {
    sessionToken: session.sessionToken,
    userId,
    phone,
    createdAt: new Date().toISOString(),
  };
}

export async function logoutViaUI(page: Page, baseURL: string): Promise<void> {
  await page.goto(`${baseURL}/profile/me/account`, {
    waitUntil: "domcontentloaded",
  });
  const logoutBtn = page.getByRole("button", { name: /cerrar sesión/i });
  if (await logoutBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await logoutBtn.click();
    const confirm = page.getByRole("button", { name: /^cerrar sesión$/i }).last();
    await expect(confirm).toBeVisible({ timeout: 5_000 });
    await confirm.click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 25_000 });
    return;
  }
  await page.evaluate(() => {
    sessionStorage.removeItem("vt_session_active");
    sessionStorage.removeItem("vt_session_token");
  });
  await page.goto(`${baseURL}/onboarding`, { waitUntil: "domcontentloaded" });
}

export async function registerUserViaUI(
  page: Page,
  baseURL: string,
  phone?: string,
): Promise<E2ESession> {
  const national = randomNationalNumber();
  const fullPhone = phone?.trim() || randomE2EPhone();
  const email = randomE2EEmail();
  const username = randomE2EUsername();
  const password = E2E_TEST_PASSWORD;

  await page.goto(`${baseURL}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /crear una cuenta nueva/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/register/);

  await fillRegisterForm(page, email, password, username, national);

  const phoneCode = await readDevOtpCode(page);
  await submitOtp(page, phoneCode);
  await expect(page).toHaveURL(/\/onboarding\/verify-email/, { timeout: 20_000 });

  const emailCode = await readDevOtpCode(page);
  await submitOtp(page, emailCode);
  await expect(page).toHaveURL(/\/home/, { timeout: 45_000 });

  const session = await readE2ESessionFromPage(page);
  return {
    ...session,
    phone: session.phone || fullPhone,
    password,
    email,
    username,
  };
}

async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible({
    timeout: 15_000,
  });
  const form = page.locator("form").first();
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[autocomplete="current-password"]').fill(password);
}

export async function loginUserViaUI(
  page: Page,
  baseURL: string,
  email: string,
  password: string,
): Promise<E2ESession> {
  await page.goto(`${baseURL}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /ya tengo cuenta/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/login/);

  await fillLoginForm(page, email, password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 45_000 });

  return readE2ESessionFromPage(page);
}
