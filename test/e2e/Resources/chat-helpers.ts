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
  const tryOffer = async (id: string): Promise<string> => {
    await page.goto(`/offer/${id}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    const notFound = page.getByText(/oferta no encontrada/i);
    if (await notFound.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return "";
    }
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
  };

  let threadId = await tryOffer(offerId);
  if (!threadId) {
    const { getE2EOfferId } = await import("./env");
    const fallback = getE2EOfferId();
    if (fallback && fallback !== offerId) {
      threadId = await tryOffer(fallback);
    }
  }
  expect(threadId.length).toBeGreaterThan(2);
  return threadId;
}

export async function waitForLinkPreviewSettled(page: Page): Promise<void> {
  const loading = page.getByText(/vista previa/i);
  const card = page.locator('a[target="_blank"]').first();
  const sawLoading = await loading.isVisible({ timeout: 8_000 }).catch(() => false);
  if (sawLoading) {
    await expect(loading).not.toBeVisible({ timeout: 25_000 });
    return;
  }
  await card.isVisible({ timeout: 25_000 }).catch(() => undefined);
}

export async function waitForChatThread(page: Page) {
  await expect
    .poll(
      async () => {
        const candidates = [
          page.locator("[data-chat-message-row]").first(),
          page.locator("[data-chat-agreement]").first(),
          page.getByRole("textbox", { name: /escribe un mensaje/i }),
          page
            .getByRole("button", { name: /^contratos$|^rutas$|^integrantes$/i })
            .first(),
        ];
        for (const loc of candidates) {
          if (await loc.isVisible().catch(() => false)) return true;
        }
        return false;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
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
  const tid = threadId.trim();
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto(`/chat/${tid}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    const loginBtn = page.getByRole("button", { name: /iniciar sesión/i });
    if (await loginBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      throw new Error("E2E session not active — chat redirected to login");
    }
    try {
      await waitForChatReady(page);
      return;
    } catch (err) {
      if (attempt === 0) {
        await page.waitForTimeout(1_000);
        continue;
      }
      throw err;
    }
  }
}

export async function openChatPeoplePanel(page: Page): Promise<void> {
  const peopleTab = page.getByRole("button", { name: /integrantes/i });
  await expect(peopleTab).toBeVisible({ timeout: 15_000 });
  await peopleTab.click();
}

export async function readIntegrantesCount(page: Page): Promise<number> {
  const memberBtn = page.getByRole("button", { name: /integrantes/i });
  await expect(memberBtn).toBeVisible({ timeout: 15_000 });
  const text = (await memberBtn.textContent().catch(() => "")) ?? "";
  return parseInt(text.match(/\d+/)?.[0] ?? "0", 10);
}

export async function readChatHeaderTitle(page: Page): Promise<string> {
  const header = page.locator(".vt-card").filter({
    has: page.getByRole("button", { name: /volver a la lista de chats/i }),
  });
  await expect(header).toBeVisible({ timeout: 15_000 });
  const title = await header.locator(".font-black").first().textContent();
  return (title ?? "").trim();
}

/** «Salir» en la lista de chats (sin acuerdo aceptado → notify-participant-left). */
export async function leaveChatFromListUI(
  page: Page,
  threadId: string,
): Promise<void> {
  await page.goto("/chat", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  const threadLink = page.locator(`a[href="/chat/${threadId}"]`);
  await expect(threadLink).toBeVisible({ timeout: 20_000 });
  await threadLink
    .locator("xpath=..")
    .getByRole("button", { name: /^salir$/i })
    .click();
  const dialog = page.getByRole("dialog", { name: /salir del chat/i });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.locator(".vt-modal-actions .vt-btn-primary").click();
  const reasonModal = page
    .getByRole("dialog")
    .filter({ has: page.locator("#chat-leave-reason-title") });
  if (await reasonModal.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await reasonModal.locator("#chat-leave-reason-ta").fill("E2E salida voluntaria");
    await reasonModal
      .getByRole("button", { name: /confirmar salida/i })
      .click();
  }
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

export async function expectParticipantRoleVisible(
  page: Page,
  roleLabel: "Comprador" | "Vendedor",
  visible: boolean,
): Promise<void> {
  const rail = page.getByRole("complementary", {
    name: /contratos, rutas e integrantes/i,
  });
  const role = rail.getByText(roleLabel, { exact: true });
  if (visible) {
    await expect(role).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(role).toBeHidden({ timeout: 15_000 });
  }
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
