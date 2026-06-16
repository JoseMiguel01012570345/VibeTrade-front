import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const CHAT_LIST_PATH = "/chat";

function chatListRowByThreadId(page: Page, threadId: string) {
  return page
    .locator("div.items-stretch")
    .filter({ has: page.locator(`a[href="/chat/${threadId}"]`) })
    .first();
}

/** @deprecated Prefer threadId via openChatLeaveFlow(page, threadId). */
function chatListRow(page: Page, threadLabel: RegExp | string) {
  const pattern =
    typeof threadLabel === "string"
      ? new RegExp(threadLabel, "i")
      : threadLabel;
  return page
    .locator(".flex.flex-col > div")
    .filter({ hasText: pattern })
    .first();
}

export async function prepareChatListLeaveSession(
  page: Page,
  threadId: string,
): Promise<void> {
  const agreementsHydrated = page.waitForResponse(
    (r) =>
      r.request().method() === "GET" &&
      r.url().includes(`/chat/threads/${threadId}/trade-agreements`) &&
      r.ok(),
    { timeout: 60_000 },
  );
  await page.goto(`/chat/${threadId}`, { waitUntil: "domcontentloaded" });
  await agreementsHydrated.catch(() => undefined);
  await expect(page.getByText(/cargando chat/i)).toBeHidden({
    timeout: 45_000,
  });
  await expect(page.getByText(/no se pudo cargar este chat/i)).toHaveCount(0, {
    timeout: 5_000,
  });
  await expect(
    page
      .getByRole("button", { name: /^rutas$|^contratos$|^integrantes$/i })
      .first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-chat-agreement]").first()).toBeVisible({
    timeout: 30_000,
  });
  await page.goto(CHAT_LIST_PATH, { waitUntil: "domcontentloaded" });
  await expect(chatListRowByThreadId(page, threadId)).toBeVisible({
    timeout: 25_000,
  });
}

export async function openChatLeaveFlow(
  page: Page,
  threadIdOrLabel: string,
): Promise<void> {
  if (threadIdOrLabel.startsWith("cth_")) {
    await prepareChatListLeaveSession(page, threadIdOrLabel);
  } else {
    await page.goto(CHAT_LIST_PATH, { waitUntil: "domcontentloaded" });
  }
  const row =
    threadIdOrLabel.startsWith("cth_")
      ? chatListRowByThreadId(page, threadIdOrLabel)
      : chatListRow(page, threadIdOrLabel);
  await expect(row).toBeVisible({ timeout: 25_000 });
  await row.getByRole("button", { name: /^salir$/i }).click();
  await expect(page.locator("#chat-leave-title")).toBeVisible({
    timeout: 10_000,
  });
}

export async function confirmChatLeaveFirstStep(page: Page): Promise<void> {
  const modal = page
    .getByRole("dialog")
    .filter({ has: page.locator("#chat-leave-title") });
  await modal.getByRole("button", { name: /sí, salir/i }).click();
  await expect(modal).toBeHidden({ timeout: 15_000 });
}

export async function fillChatLeaveReasonModal(
  page: Page,
  reason: string,
  opts: { confirm?: boolean } = {},
): Promise<void> {
  const modal = page
    .getByRole("dialog")
    .filter({ has: page.locator("#chat-leave-reason-title") });
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.locator("#chat-leave-reason-ta").fill(reason);
  if (opts.confirm !== false) {
    await modal.getByRole("button", { name: /confirmar salida/i }).click();
  }
}

export async function partySoftLeaveViaChatListUI(
  page: Page,
  threadId: string,
  reason: string,
): Promise<void> {
  await openChatLeaveFlow(page, threadId);
  await confirmChatLeaveFirstStep(page);
  await fillChatLeaveReasonModal(page, reason);
}

export async function carrierWithdrawViaChatListUI(
  page: Page,
  threadId: string,
  reason: string,
): Promise<void> {
  await partySoftLeaveViaChatListUI(page, threadId, reason);
}

export async function assertNoNativeDialogDuring(
  page: Page,
  action: () => Promise<void>,
): Promise<void> {
  let fired = false;
  const handler = () => {
    fired = true;
  };
  page.on("dialog", handler);
  try {
    await action();
  } finally {
    page.off("dialog", handler);
  }
  expect(fired).toBe(false);
}

export async function expectLeaveBlockedInModal(
  page: Page,
  codePattern?: RegExp | string,
): Promise<void> {
  const modal = page
    .getByRole("dialog")
    .filter({ has: page.locator("#chat-leave-title") });
  await expect(modal.getByText(/salida bloqueada/i)).toBeVisible({
    timeout: 15_000,
  });
  if (codePattern) {
    const re =
      typeof codePattern === "string"
        ? new RegExp(codePattern, "i")
        : codePattern;
    await expect(modal).toContainText(re);
  }
  await expect(
    modal.getByRole("button", { name: /sí, salir/i }),
  ).toBeDisabled();
}

export async function expectLeaveSuccessToast(
  page: Page,
  scope?: RegExp | string,
): Promise<void> {
  const pattern =
    scope ??
    /se ajustó|salida registrada|des-suscribiste|dejaste de formar parte/i;
  await expect(page.getByText(pattern).first()).toBeVisible({
    timeout: 20_000,
  });
}

export async function expectThreadAbsentFromChatList(
  page: Page,
  threadId: string,
): Promise<void> {
  await page.goto(CHAT_LIST_PATH, { waitUntil: "domcontentloaded" });
  await expect(page.locator(`a[href="/chat/${threadId}"]`)).toHaveCount(0, {
    timeout: 20_000,
  });
}

export async function expectThreadPresentInChatList(
  page: Page,
  threadId: string,
): Promise<void> {
  await page.goto(CHAT_LIST_PATH, { waitUntil: "domcontentloaded" });
  await expect(chatListRowByThreadId(page, threadId)).toBeVisible({
    timeout: 20_000,
  });
}

async function waitForOfferPageSubscriptionHydration(page: Page): Promise<void> {
  await Promise.race([
    page
      .waitForResponse(
        (r) =>
          r.request().method() === "GET" &&
          r.url().includes("my-route-tramo-subscriptions") &&
          r.ok(),
        { timeout: 25_000 },
      )
      .catch(() => null),
    page
      .waitForResponse(
        (r) =>
          r.request().method() === "GET" &&
          r.url().includes("/route-tramo-subscriptions") &&
          r.ok(),
        { timeout: 25_000 },
      )
      .catch(() => null),
  ]);
  await page.waitForTimeout(500);
}

export async function expectOpenTramosCountOnOfferPage(
  page: Page,
  n: number,
): Promise<void> {
  const deadline = Date.now() + 45_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await waitForOfferPageSubscriptionHydration(page);
      await expectOpenTramosCountOnOfferPageOnce(page, n);
      return;
    } catch (err) {
      lastError = err;
      await page.waitForTimeout(1_500);
      await page.reload({ waitUntil: "domcontentloaded" }).catch(() => null);
    }
  }
  await expectOpenTramosCountOnOfferPageOnce(page, n).catch(() => {
    throw lastError;
  });
}

async function expectOpenTramosCountOnOfferPageOnce(
  page: Page,
  n: number,
): Promise<void> {
  const section = page.locator("#hoja-suscribir");
  await expect(section).toBeVisible({ timeout: 20_000 });
  await expect(
    section.getByText(/suscribirme a un tramo|todos los tramos tienen transportista/i).first(),
  ).toBeVisible({ timeout: 20_000 });

  if (n === 0) {
    await expect(
      section.getByText(/todos los tramos tienen transportista/i),
    ).toBeVisible({ timeout: 15_000 });
    return;
  }

  const tramoLabels = section.locator("label").filter({ hasText: /tramo \d/i });
  const tramoButtons = section.getByRole("button").filter({
    hasText: /solicitar|suscribir|tramo/i,
  });
  const labelCount = await tramoLabels.count();
  if (labelCount > 0) {
    expect(labelCount).toBe(n);
    return;
  }
  const buttonCount = await tramoButtons.count();
  if (buttonCount > 0) {
    expect(buttonCount).toBe(n);
    return;
  }
  const rows = section.locator("li, [data-tramo], .vt-tramo-row");
  await expect(rows).toHaveCount(n, { timeout: 15_000 });
}

export async function expectRouteSheetTramoFieldStates(
  page: Page,
  tramoIndex: number,
  opts: {
    phoneEditable?: boolean;
    destinationEditable?: boolean;
  },
): Promise<void> {
  const tramo = page.getByRole("listitem").nth(tramoIndex);
  const phone = tramo.locator('input[id*="telefono"], input[name*="telefono"]');
  if (opts.phoneEditable === true) {
    await expect(phone.first()).toBeEnabled({ timeout: 10_000 });
  } else if (opts.phoneEditable === false) {
    await expect(phone.first()).toBeDisabled({ timeout: 10_000 });
  }
  const dest = tramo.locator('input[id*="destino"], input[name*="destino"]');
  if (opts.destinationEditable === true) {
    await expect(dest.first()).toBeEnabled({ timeout: 10_000 });
  } else if (opts.destinationEditable === false) {
    await expect(dest.first()).toBeDisabled({ timeout: 10_000 });
  }
}
