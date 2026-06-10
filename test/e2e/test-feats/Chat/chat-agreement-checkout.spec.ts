import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  e2eOfferId,
  getE2EScenario,
  getE2ESellerSession,
  getE2ESession,
  getE2EToken,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  buyerRespondToAgreement,
  createThreadAsBuyer,
  injectE2ESession,
  openSellerPage,
  sellerEmitDualCurrencyServiceAgreement,
  sellerEmitMerchandiseAgreement,
  sellerEmitMerchandiseDualCurrencyAgreement,
} from "../../Resources/agreement-ui-helpers";
import { openChatThread, reloadChatThread, waitForAgreementBubble } from "../../Resources/chat-helpers";
import {
  addProductViaUI,
  addServiceViaUI,
  publishCatalogItemViaUI,
} from "../../Resources/e2e-ui-store";
import {
  assertInformePdfContent,
  clearServiceRecurrences,
  confirmInformeCheckbox,
  downloadPaymentInformePdf,
  enableServiceForPayment,
  expectAllPaymentsSettled,
  expectPaidServiceRecurrenceHidden,
  expectInformeCurrencyBlocks,
  expectPaymentModalChrome,
  expectPaymentCardConfigLink,
  expectStripeAviso,
  clickPayCurrency,
  openCardConfigFromPaymentModal,
  openChatPaymentModal,
  paymentModal,
  pickServiceRecurrences,
  setAllMerchandiseLines,
  setMerchandiseLineChecked,
  ensureBuyerDemoCard,
  buyerHasPayCard,
  waitForInformeReady,
  waitForPayableRoutePathsInPaymentModal,
  syncBuyerRouteSheetsForCheckout,
  prepareBuyerRouteCheckout,
  selectAllRoutePathsForPayment,
} from "../../Resources/payment-checkout-ui-helpers";
import {
  createDisconnectedTwoStopRouteSheet,
  createLinkedTwoStopRouteSheet,
} from "../../Resources/route-sheet-ui-helpers";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

test.describe("chat agreement checkout (UI)", () => {
  test.describe.configure({ mode: "serial", timeout: 240_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  let dualServiceName: string;
  let eurProductName: string;

  test.beforeAll(async ({ browser }) => {
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const ctx = await browser.newContext();
    await injectE2ESession(ctx, seller.sessionToken);
    const page = await ctx.newPage();

    dualServiceName = `Transporte dual E2E ${Date.now()}`;
    await addServiceViaUI(page, BASE_URL, scenario.storeId, dualServiceName, {
      acceptedCurrencies: ["USD", "EUR"],
    });
    await publishCatalogItemViaUI(page, dualServiceName);

    eurProductName = `Producto EUR E2E ${Date.now()}`;
    await addProductViaUI(page, BASE_URL, scenario.storeId, eurProductName, {
      price: "15",
      priceCurrency: "EUR",
      acceptedCurrencies: ["EUR"],
    });
    await publishCatalogItemViaUI(page, eurProductName);

    await ctx.close();
  });

  test.describe("service dual currency breakdown", () => {
    test("modal chrome, PDF informe and card config link", async ({
      browser,
    }) => {
      const seller = getE2ESellerSession()!;
      const buyer = getE2ESession()!;
      const title = `E2E Checkout Chrome ${Date.now()}`;

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

      await sellerEmitDualCurrencyServiceAgreement(sellerPage, {
        title,
        serviceNamePart: dualServiceName,
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");

      await ensureBuyerDemoCard(buyerPage, threadId);
      await openChatPaymentModal(buyerPage);
      await expectPaymentModalChrome(buyerPage);

      await enableServiceForPayment(buyerPage, dualServiceName);
      await expectPaymentCardConfigLink(buyerPage);
      await expectInformeCurrencyBlocks(buyerPage, ["USD"]);
      await expectStripeAviso(buyerPage, "USD");

      const { buffer } = await downloadPaymentInformePdf(buyerPage);
      assertInformePdfContent(buffer, {
        agreementTitle: title,
        currencies: ["USD"],
      });

      await openCardConfigFromPaymentModal(buyerPage, buyer.userId);

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("service default breakdown shows USD only (first recurrence)", async ({
      browser,
    }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Svc USD def ${Date.now()}`;

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

      await sellerEmitDualCurrencyServiceAgreement(sellerPage, {
        title,
        serviceNamePart: dualServiceName,
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");
      await reloadChatThread(buyerPage);
      await openChatPaymentModal(buyerPage);

      await enableServiceForPayment(buyerPage, dualServiceName);
      await expectInformeCurrencyBlocks(buyerPage, ["USD"]);
      await expect(
        paymentModal(buyerPage).getByText(/moneda eur/i),
      ).toBeHidden();

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("service recurrence selection filters EUR, USD, then both sorted", async ({
      browser,
    }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Svc pick ${Date.now()}`;

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

      await sellerEmitDualCurrencyServiceAgreement(sellerPage, {
        title,
        serviceNamePart: dualServiceName,
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");
      await reloadChatThread(buyerPage);
      await openChatPaymentModal(buyerPage);
      await enableServiceForPayment(buyerPage, dualServiceName);

      await clearServiceRecurrences(buyerPage, dualServiceName);
      await pickServiceRecurrences(buyerPage, [/eur/i], dualServiceName);
      await expectInformeCurrencyBlocks(buyerPage, ["EUR"]);

      await clearServiceRecurrences(buyerPage, dualServiceName);
      await pickServiceRecurrences(buyerPage, [/usd/i], dualServiceName);
      await expectInformeCurrencyBlocks(buyerPage, ["USD"]);

      await clearServiceRecurrences(buyerPage, dualServiceName);
      await pickServiceRecurrences(buyerPage, [/eur/i, /usd/i], dualServiceName);
      const modal = paymentModal(buyerPage);
      const blocks = modal.getByText(/^moneda /i);
      await expect(blocks).toHaveCount(2);
      const first = ((await blocks.nth(0).textContent()) ?? "").toLowerCase();
      const second = ((await blocks.nth(1).textContent()) ?? "").toLowerCase();
      expect(first).toContain("eur");
      expect(second).toContain("usd");

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("service pay USD then EUR after breakdown", async ({ browser }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Svc pay ${Date.now()}`;

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

      await sellerEmitDualCurrencyServiceAgreement(sellerPage, {
        title,
        serviceNamePart: dualServiceName,
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");
      await ensureBuyerDemoCard(buyerPage, threadId);
      test.skip(
        !(await buyerHasPayCard(buyerPage, threadId)),
        "Buyer needs a saved Stripe card to execute payments",
      );

      await openChatPaymentModal(buyerPage);
      await enableServiceForPayment(buyerPage, dualServiceName);
      await pickServiceRecurrences(buyerPage, [/usd/i], dualServiceName);
      await confirmInformeCheckbox(buyerPage);
      await clickPayCurrency(buyerPage, "USD");

      await pickServiceRecurrences(buyerPage, [/eur/i], dualServiceName);
      await confirmInformeCheckbox(buyerPage);
      await clickPayCurrency(buyerPage, "EUR");
      await expectAllPaymentsSettled(buyerPage);

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("duplicate service recurrence shows toast", async ({ browser }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Svc dup ${Date.now()}`;

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

      await sellerEmitDualCurrencyServiceAgreement(sellerPage, {
        title,
        serviceNamePart: dualServiceName,
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");
      await ensureBuyerDemoCard(buyerPage, threadId);
      test.skip(
        !(await buyerHasPayCard(buyerPage, threadId)),
        "Buyer needs a saved Stripe card to execute payments",
      );

      await openChatPaymentModal(buyerPage);
      await enableServiceForPayment(buyerPage, dualServiceName);
      await pickServiceRecurrences(buyerPage, [/usd/i], dualServiceName);
      await confirmInformeCheckbox(buyerPage);
      await clickPayCurrency(buyerPage, "USD");
      await expectPaidServiceRecurrenceHidden(
        buyerPage,
        /usd/i,
        dualServiceName,
      );
      await expect(
        paymentModal(buyerPage).getByRole("button", { name: /^pagar USD$/i }),
      ).toHaveCount(0);

      await sellerPage.close();
      await buyerPage.context().close();
    });
  });

  test.describe("merchandise dual currency breakdown", () => {
    test("merch EUR line only then both buckets", async ({ browser }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Merch 2ccy ${Date.now()}`;

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

      await sellerEmitMerchandiseDualCurrencyAgreement(sellerPage, {
        title,
        usdProductNamePart: "Producto E2E",
        eurProductNamePart: eurProductName,
        usdQty: "1",
        eurQty: "2",
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");
      await reloadChatThread(buyerPage);
      await openChatPaymentModal(buyerPage);

      await setAllMerchandiseLines(buyerPage, false);
      await setMerchandiseLineChecked(buyerPage, new RegExp(eurProductName, "i"), true);
      await expectInformeCurrencyBlocks(buyerPage, ["EUR"]);

      await setMerchandiseLineChecked(
        buyerPage,
        /Producto E2E/i,
        true,
      );
      await expectInformeCurrencyBlocks(buyerPage, ["EUR", "USD"]);

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("merch pay EUR then USD after breakdown", async ({ browser }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Merch pay ${Date.now()}`;

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

      await sellerEmitMerchandiseDualCurrencyAgreement(sellerPage, {
        title,
        usdProductNamePart: "Producto E2E",
        eurProductNamePart: eurProductName,
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");
      await ensureBuyerDemoCard(buyerPage, threadId);
      test.skip(
        !(await buyerHasPayCard(buyerPage, threadId)),
        "Buyer needs a saved Stripe card to execute payments",
      );

      await openChatPaymentModal(buyerPage);
      await setAllMerchandiseLines(buyerPage, false);
      await setMerchandiseLineChecked(buyerPage, new RegExp(eurProductName, "i"), true);
      await confirmInformeCheckbox(buyerPage);
      await clickPayCurrency(buyerPage, "EUR");

      await setMerchandiseLineChecked(
        buyerPage,
        new RegExp(eurProductName, "i"),
        false,
      );
      await setMerchandiseLineChecked(buyerPage, /Producto E2E/i, true);
      await confirmInformeCheckbox(buyerPage);
      await clickPayCurrency(buyerPage, "USD");
      await expectAllPaymentsSettled(buyerPage);

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("duplicate merchandise line shows toast", async ({ browser }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Merch dup ${Date.now()}`;

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

      await sellerEmitMerchandiseDualCurrencyAgreement(sellerPage, {
        title,
        usdProductNamePart: "Producto E2E",
        eurProductNamePart: eurProductName,
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");
      await ensureBuyerDemoCard(buyerPage, threadId);
      test.skip(
        !(await buyerHasPayCard(buyerPage, threadId)),
        "Buyer needs a saved Stripe card to execute payments",
      );

      await openChatPaymentModal(buyerPage);
      await setAllMerchandiseLines(buyerPage, false);
      await setMerchandiseLineChecked(buyerPage, /Producto E2E/i, true);
      await confirmInformeCheckbox(buyerPage);
      await clickPayCurrency(buyerPage, "USD");
      await expect(
        paymentModal(buyerPage).getByText(
          /no hay importes para cobrar|sin montos a cobrar/i,
        ),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        paymentModal(buyerPage).getByRole("button", { name: /^pagar USD$/i }),
      ).toHaveCount(0);

      await sellerPage.close();
      await buyerPage.context().close();
    });
  });

  test.describe("route paths in checkout", () => {
    test("linked stops show one route path with two paradas", async ({
      browser,
    }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Ruta link ${Date.now()}`;

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

      await sellerEmitMerchandiseAgreement(sellerPage, {
        title,
        productNamePart: "Producto E2E",
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");

      const routeTitulo = await createLinkedTwoStopRouteSheet(sellerPage, title);
      await reloadChatThread(buyerPage);
      await prepareBuyerRouteCheckout(buyerPage, title, routeTitulo);

      const modal = paymentModal(buyerPage);
      await expect(
        modal.getByText(/transporte \(rutas enlazadas\)/i),
      ).toBeVisible();
      await expect(modal.getByText(/1\. ciudad a → ciudad b/i)).toBeVisible();
      await expect(modal.getByText(/2\. ciudad b → ciudad c/i)).toBeVisible();
      const routeChecks = modal
        .locator("label")
        .filter({ hasText: /parada\(s\)/i });
      await expect(routeChecks).toHaveCount(1);

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("disconnected stops show two route paths", async ({ browser }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Ruta disc ${Date.now()}`;

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

      await sellerEmitMerchandiseAgreement(sellerPage, {
        title,
        productNamePart: "Producto E2E",
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");

      const routeTitulo = await createDisconnectedTwoStopRouteSheet(
        sellerPage,
        title,
      );
      await reloadChatThread(buyerPage);
      await prepareBuyerRouteCheckout(buyerPage, title, routeTitulo);

      const modal = paymentModal(buyerPage);
      const routeChecks = modal
        .locator("label")
        .filter({ hasText: /parada\(s\)/i });
      await expect(routeChecks).toHaveCount(2);

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("selecting linked path expands both stops in informe", async ({
      browser,
    }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Ruta informe ${Date.now()}`;

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

      await sellerEmitMerchandiseAgreement(sellerPage, {
        title,
        productNamePart: "Producto E2E",
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");
      const routeTitulo = await createLinkedTwoStopRouteSheet(sellerPage, title);
      await reloadChatThread(buyerPage);
      await prepareBuyerRouteCheckout(buyerPage, title, routeTitulo);

      await setAllMerchandiseLines(buyerPage, false);
      await selectAllRoutePathsForPayment(buyerPage);
      const modal = paymentModal(buyerPage);
      await expect(modal.getByText(/informe/i).first()).toBeVisible();
      const informeText = (await modal.textContent()) ?? "";
      expect(informeText.toLowerCase()).toMatch(/transporte|ruta|tramo|10|20|30/);

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("pay one disconnected path leaves sibling payable", async ({
      browser,
    }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Ruta partial ${Date.now()}`;

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

      await sellerEmitMerchandiseAgreement(sellerPage, {
        title,
        productNamePart: "Producto E2E",
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");
      const routeTitulo = await createDisconnectedTwoStopRouteSheet(
        sellerPage,
        title,
      );
      await ensureBuyerDemoCard(buyerPage, threadId);
      test.skip(
        !(await buyerHasPayCard(buyerPage, threadId)),
        "Buyer needs a saved Stripe card to execute payments",
      );

      await syncBuyerRouteSheetsForCheckout(buyerPage, title, routeTitulo);
      await openChatPaymentModal(buyerPage);
      await waitForPayableRoutePathsInPaymentModal(buyerPage);
      await setAllMerchandiseLines(buyerPage, false);

      const modal = paymentModal(buyerPage);
      const paths = modal.locator("label").filter({ hasText: /parada\(s\)/i });
      await paths.nth(0).locator('input[type="checkbox"]').check();
      await paths.nth(1).locator('input[type="checkbox"]').uncheck();
      await confirmInformeCheckbox(buyerPage);
      await clickPayCurrency(buyerPage, "USD");

      await pageKeyboardCloseAndReopen(buyerPage, threadId);
      await setAllMerchandiseLines(buyerPage, false);
      const pathsAfter = paymentModal(buyerPage)
        .locator("label")
        .filter({ hasText: /parada\(s\)/i });
      await expect(pathsAfter).toHaveCount(1);

      await sellerPage.close();
      await buyerPage.context().close();
    });
  });
});

async function pageKeyboardCloseAndReopen(
  page: import("@playwright/test").Page,
  threadId: string,
): Promise<void> {
  await page.keyboard.press("Escape");
  await expect(paymentModal(page)).toBeHidden({ timeout: 10_000 });
  await openChatThread(page, threadId);
  await openChatPaymentModal(page);
  await waitForPayableRoutePathsInPaymentModal(page);
}
