import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  e2eOfferId,
  getE2EToken,
} from "../../Resources/chat-env";
import { FIXTURE_PNG, FIXTURE_PDF } from "../../Resources/e2e-fixtures";
import { installChatVoiceRecorderMock } from "../../Resources/chat-voice-mock";
import {
  attachDocumentsViaUI,
  attachImagesViaUI,
  expectReplyQuoteVisible,
  openOfferAndComprar,
  recordAndSendVoiceNoteViaUI,
  selectMessageRowForReply,
  sendChatMessageViaUI,
  sendComposerViaUI,
  waitForChatReady,
} from "../../Resources/chat-helpers";

/** Paridad E2E con ChatMultimediaAndRepliesIntegrationTests. */
test.describe("chat multimedia and replies E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);

  test("thread has image, doc, text reply, docs bundle and audio with reply chains", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    const ctx = await browser.newContext();
    await installChatVoiceRecorderMock(ctx);
    await ctx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, getE2EToken());
    const page = await ctx.newPage();

    await openOfferAndComprar(page, e2eOfferId);
    await waitForChatReady(page);

    await attachImagesViaUI(page, [FIXTURE_PNG], "cap-img");
    await sendComposerViaUI(page);
    await expect(
      page.locator("[data-chat-message-row]").filter({ hasText: "cap-img" }).first(),
    ).toBeVisible({ timeout: 45_000 });

    await attachDocumentsViaUI(page, [FIXTURE_PDF], "cap-doc");
    await sendComposerViaUI(page);
    await expect(
      page.locator("[data-chat-message-row]").filter({ hasText: "cap-doc" }).first(),
    ).toBeVisible({ timeout: 45_000 });

    await selectMessageRowForReply(page, "cap-img");
    await expectReplyQuoteVisible(page, "cap-img");
    await sendChatMessageViaUI(page, "replying to image");

    await selectMessageRowForReply(page, "cap-doc");
    await attachDocumentsViaUI(page, [FIXTURE_PDF, FIXTURE_PNG], "dos adjuntos");
    await sendComposerViaUI(page);
    await expect(page.getByText("dos adjuntos").first()).toBeVisible({
      timeout: 30_000,
    });

    await selectMessageRowForReply(page, "replying to image");
    await recordAndSendVoiceNoteViaUI(page);
    const pendingVoice = page
      .getByLabel(/archivos listos para enviar/i)
      .getByText(/nota de voz/i);
    if (await pendingVoice.isVisible().catch(() => false)) {
      await sendComposerViaUI(page);
    }

    await expect
      .poll(async () => page.locator("[data-chat-message-row]").count(), {
        timeout: 30_000,
      })
      .toBeGreaterThanOrEqual(6);
    await expect(page.getByText("replying to image").first()).toBeVisible();

    await ctx.close();
  });
});
