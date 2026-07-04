import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  e2eOfferId,
  getE2EToken,
  getE2ESellerSession,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  buyerRespondToAgreement,
  createThreadAsBuyer,
  openAgreementDetailInRail,
  openSellerPage,
  sellerEmitServiceAgreement,
} from "../../Resources/agreement-ui-helpers";
import { waitForAgreementBubble } from "../../Resources/chat-helpers";

/** Paridad E2E con tradeAgreementPdfDownload.test.ts */
test.describe("tradeAgreementPdfDownload E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("plain document includes agreement title in PDF download", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const seller = getE2ESellerSession()!;
    const title = `E2E PDF ${Date.now()}`;
    const { buyerPage, threadId } = await createThreadAsBuyer(
      browser,
      getE2EToken(),
      e2eOfferId,
    );
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await sellerEmitServiceAgreement(sellerPage, {
      title,
      serviceNamePart: "Consultoría E2E",
    });
    await waitForAgreementBubble(buyerPage, title);
    await buyerRespondToAgreement(buyerPage, title, "accept");
    await openAgreementDetailInRail(buyerPage, title);
    const downloadBtn = buyerPage.getByRole("button", {
      name: /descargar pdf/i,
    });
    await expect(downloadBtn).toBeVisible();
    const [download] = await Promise.all([
      buyerPage.waitForEvent("download", { timeout: 30_000 }),
      downloadBtn.click(),
    ]);
    const path = await download.path();
    expect(path).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    await sellerPage.close();
    await buyerPage.context().close();
  });
});
