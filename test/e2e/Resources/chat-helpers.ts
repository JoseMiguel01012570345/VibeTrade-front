import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function waitForAgreementBubble(
  page: Page,
  title: string,
): Promise<void> {
  await expect(
    page.locator("[data-chat-agreement]").filter({ hasText: title }).last(),
  ).toBeVisible({ timeout: 35_000 });
}

export async function openOfferAndComprar(page: Page, offerId: string) {
  await page.goto(`/offer/${offerId}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  const comprar = page.getByRole("button", {
    name: /comprar.*chat/i,
  });
  await expect(comprar).toBeVisible({ timeout: 30_000 });
  await comprar.click();
  const confirm = page.getByRole("button", {
    name: /sí, abrir chat|confirmar|abrir chat|continuar/i,
  });
  await expect(confirm).toBeVisible({ timeout: 15_000 });
  await confirm.click();
  await expect(page).toHaveURL(/\/chat\/cth_/, { timeout: 45_000 });
  return page.url().match(/\/chat\/(cth_[^/?#]+)/)?.[1] ?? "";
}

export async function waitForChatThread(page: Page) {
  await expect(page.locator("[data-chat-message-row]").first()).toBeVisible({
    timeout: 20_000,
  });
}

export async function waitForChatReady(page: Page): Promise<void> {
  await expect(page.getByText(/cargando chat/i)).toBeHidden({ timeout: 45_000 });
  await waitForChatThread(page);
}

export async function reloadChatThread(page: Page): Promise<void> {
  try {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForChatReady(page);
  } catch {
    const threadId = page.url().match(/\/chat\/(cth_[^/?#]+)/)?.[1];
    if (threadId) {
      await openChatThread(page, threadId);
    } else {
      throw new Error("reloadChatThread failed and thread id is unknown");
    }
  }
}

export async function openRailContracts(page: Page) {
  const contractsTab = page.getByRole("button", { name: /^contratos$/i });
  if (await contractsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await contractsTab.click();
  }
}

export async function openChatThread(page: Page, threadId: string): Promise<void> {
  await page.goto(`/chat/${threadId}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await expect(page.getByText(/cargando chat/i)).toBeHidden({ timeout: 30_000 });
  await waitForChatThread(page);
  await expect(page.getByRole("button", { name: /emitir acuerdo/i })).toBeVisible({
    timeout: 20_000,
  });
}

export async function sendChatMessageViaUI(page: Page, text: string): Promise<void> {
  const input = page.getByPlaceholder(/escribe un mensaje|escribe una respuesta/i);
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill(text);
  await page.getByRole("button", { name: /^enviar mensaje$/i }).click();
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 20_000 });
}
