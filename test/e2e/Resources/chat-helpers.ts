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
  await waitForChatReady(page);
}

export async function openChatPeoplePanel(page: Page): Promise<void> {
  const peopleTab = page.getByRole("button", { name: /integrantes/i });
  await expect(peopleTab).toBeVisible({ timeout: 15_000 });
  await peopleTab.click();
}

export function chatParticipantProfileLinks(page: Page) {
  return page.locator(
    "a[href^='/profile/'], a[href*='/store/'][href*='vitrina']",
  );
}

export async function sendChatMessageViaUI(page: Page, text: string): Promise<void> {
  const input = page.getByPlaceholder(/escribe un mensaje|escribe una respuesta/i);
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill(text);
  await sendComposerViaUI(page);
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 20_000 });
}

export async function sendComposerViaUI(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^enviar mensaje$/i }).click();
}

export async function attachImagesViaUI(
  page: Page,
  filePaths: string[],
  caption?: string,
): Promise<void> {
  await page.getByLabel(/adjuntar imágenes/i).locator('input[type="file"]').setInputFiles(filePaths);
  await expect(
    page.getByLabel(/archivos listos para enviar/i),
  ).toBeVisible({ timeout: 30_000 });
  if (caption) {
    const input = page.getByPlaceholder(/escribe un mensaje|añade un mensaje/i);
    await input.fill(caption);
  }
}

export async function attachDocumentsViaUI(
  page: Page,
  filePaths: string[],
  caption?: string,
): Promise<void> {
  await page.getByLabel(/adjuntar documentos/i).locator('input[type="file"]').setInputFiles(filePaths);
  await expect(
    page.getByLabel(/archivos listos para enviar/i),
  ).toBeVisible({ timeout: 30_000 });
  if (caption) {
    const input = page.getByPlaceholder(/escribe un mensaje|añade un mensaje/i);
    await input.fill(caption);
  }
}

export async function selectMessageRowForReply(
  page: Page,
  text: string,
): Promise<void> {
  const row = page
    .locator("[data-chat-message-row]")
    .filter({ hasText: text })
    .first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  // Image/doc bubbles use data-chat-interactive on media; click caption/text instead.
  await row.getByText(text, { exact: false }).first().click();
}

export async function expectReplyQuoteVisible(
  page: Page,
  quotedText: string,
): Promise<void> {
  await expect(
    page.getByRole("region", {
      name: /respondiendo a mensajes en un hilo nuevo/i,
    }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(quotedText).first()).toBeVisible();
}

export async function recordAndSendVoiceNoteViaUI(page: Page): Promise<void> {
  const micBtn = page.getByRole("button", { name: /^grabar nota de voz$/i });
  await expect(micBtn).toBeVisible({ timeout: 15_000 });
  await micBtn.click();
  await expect(page.getByText(/grabando nota de voz/i).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect
    .poll(
      async () => {
        const status = await page.getByRole("status").textContent();
        return status?.includes("0:01") || status?.includes("0:02");
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  const stopBtn = page.getByRole("button", { name: /detener y enviar nota de voz/i });
  await stopBtn.click();
  await expect(page.getByText(/grabando nota de voz/i).first()).toBeHidden({
    timeout: 20_000,
  });
  const pendingVoice = page
    .getByLabel(/archivos listos para enviar/i)
    .getByText(/nota de voz/i);
  const sentNotice = page.getByText(/nota de voz enviada|nota de voz añadida/i);
  await expect(pendingVoice.or(sentNotice).first()).toBeVisible({
    timeout: 20_000,
  });
}
