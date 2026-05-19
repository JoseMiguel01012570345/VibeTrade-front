import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { E2ESession } from "./e2e-session";

function randomNationalNumber(): string {
  const n = Math.floor(100_000_000 + Math.random() * 899_999_999);
  return String(n);
}

export function randomE2EPhone(): string {
  return `+549${randomNationalNumber()}`;
}

export async function isE2EAppReachable(
  page: Page,
  baseURL: string,
): Promise<boolean> {
  try {
    await page.goto(`${baseURL}/onboarding`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    await expect(
      page.getByRole("button", { name: /crear una cuenta nueva/i }),
    ).toBeVisible({ timeout: 15_000 });
    return true;
  } catch {
    return false;
  }
}

async function fillPhoneAndRequestCode(
  page: Page,
  phoneDigits: string,
): Promise<void> {
  await page.getByPlaceholder(/5555/i).fill(phoneDigits);
  await page.getByRole("button", { name: /enviar código/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/otp/, { timeout: 20_000 });
}

async function readDevOtpCode(page: Page): Promise<string> {
  const devCode = page.locator(
    "div:has-text('Dev:') span.font-black",
  );
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
  const continuar = page.getByRole("button", { name: /^continuar$/i });
  if (await continuar.isEnabled({ timeout: 2_000 }).catch(() => false)) {
    await continuar.click();
  }
  await expect(page).toHaveURL(/\/home/, { timeout: 45_000 });
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

  await page.goto(`${baseURL}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /crear una cuenta nueva/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/phone/);

  await fillPhoneAndRequestCode(page, national);
  const code = await readDevOtpCode(page);
  await submitOtp(page, code);

  const session = await readE2ESessionFromPage(page);
  return { ...session, phone: session.phone || fullPhone };
}

export async function loginUserViaUI(
  page: Page,
  baseURL: string,
  phone: string,
): Promise<E2ESession> {
  const national = phone.replace(/\D/g, "").replace(/^549/, "").slice(-9);

  await page.goto(`${baseURL}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /ya tengo cuenta/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/phone/);

  await fillPhoneAndRequestCode(page, national);
  const code = await readDevOtpCode(page);
  await submitOtp(page, code);

  return readE2ESessionFromPage(page);
}
