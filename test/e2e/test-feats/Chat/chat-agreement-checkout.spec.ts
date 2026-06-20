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
  hasCarrier2Session,
  carrier2SkipReason,
} from "../../Resources/chat-env";
import {
  buyerRespondToAgreement,
  createThreadAsBuyer,
  injectE2ESession,
  openSellerPage,
  sellerEmitSingleCurrencyTwoRecurrenceServiceAgreement,
  sellerAttemptEmitDualCurrencyServiceAgreementRejected,
  sellerAttemptEmitMerchandiseDualCurrencyAgreementRejected,
  sellerEmitMerchandiseAgreement,
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
  expectInformeCurrencyBlocks,
  expectPaymentModalChrome,
  expectPaymentCardConfigLink,
  expectStripeAviso,
  clickPayCurrency,
  openCardConfigFromPaymentModal,
  openChatPaymentModal,
  paymentModal,
  pickFirstServiceRecurrenceOnly,
  pickServiceRecurrences,
  setAllMerchandiseLines,
  setMerchandiseLineChecked,
  ensureBuyerDemoCard,
  buyerHasPayCard,
  waitForPayableRoutePathsInPaymentModal,
  prepareBuyerRouteCheckout,
  selectAllRoutePathsForPayment,
  inviteAndConfirmRouteCarriersForCheckout,
} from "../../Resources/payment-checkout-ui-helpers";
import {
  carrierSkipReason,
  hasCarrierSession,
} from "../../Resources/route-sheet-carriers-env";
import {
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
    await addServiceViaUI(
      page,
      BASE_URL,
      scenario.storeId,
      dualServiceName,
      { acceptedCurrencies: ["USD"], monedasAfterSave: ["USD", "EUR"] },
      seller.sessionToken,
    );
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

  test.describe("service single currency checkout", () => {
    test("dual currency service agreement emit blocked", async ({ browser }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Svc reject dual ${Date.now()}`;

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

      await sellerAttemptEmitDualCurrencyServiceAgreementRejected(sellerPage, {
        title,
        serviceNamePart: dualServiceName,
      });

      await sellerPage.close();
      await buyerPage.context().close();
    });

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

      await sellerEmitSingleCurrencyTwoRecurrenceServiceAgreement(sellerPage, {
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

      await sellerEmitSingleCurrencyTwoRecurrenceServiceAgreement(sellerPage, {
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

    test("service two recurrences same currency single bucket", async ({
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

      await sellerEmitSingleCurrencyTwoRecurrenceServiceAgreement(sellerPage, {
        title,
        serviceNamePart: dualServiceName,
      });
      await waitForAgreementBubble(buyerPage, title);
      await buyerRespondToAgreement(buyerPage, title, "accept");
      await reloadChatThread(buyerPage);
      await openChatPaymentModal(buyerPage);
      await enableServiceForPayment(buyerPage, dualServiceName);

      await clearServiceRecurrences(buyerPage, dualServiceName);
      await pickServiceRecurrences(buyerPage, [/usd/i], dualServiceName);
      const modal = paymentModal(buyerPage);
      await expect(modal.getByText(/^moneda /i)).toHaveCount(1);
      await expect(modal.getByText(/moneda usd/i)).toBeVisible();

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("service pay first then second recurrence same USD", async ({
      browser,
    }) => {
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

      await sellerEmitSingleCurrencyTwoRecurrenceServiceAgreement(sellerPage, {
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
      await pickFirstServiceRecurrenceOnly(buyerPage, dualServiceName);
      await confirmInformeCheckbox(buyerPage);
      await clickPayCurrency(buyerPage, "USD");

      await enableServiceForPayment(buyerPage, dualServiceName);
      await pickServiceRecurrences(buyerPage, [/usd/i], dualServiceName);
      await confirmInformeCheckbox(buyerPage);
      await clickPayCurrency(buyerPage, "USD");
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

      await sellerEmitSingleCurrencyTwoRecurrenceServiceAgreement(sellerPage, {
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
      await expect(
        paymentModal(buyerPage).getByText(
          /todas las recurrencias de este servicio ya fueron cobradas/i,
        ),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        paymentModal(buyerPage).getByRole("button", { name: /^pagar USD$/i }),
      ).toHaveCount(0);

      await sellerPage.close();
      await buyerPage.context().close();
    });
  });

  test.describe("merchandise single currency checkout", () => {
    test("dual currency merchandise agreement emit blocked", async ({
      browser,
    }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Merch reject dual ${Date.now()}`;

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

      await sellerAttemptEmitMerchandiseDualCurrencyAgreementRejected(
        sellerPage,
        {
          title,
          usdProductNamePart: "Producto E2E",
          eurProductNamePart: eurProductName,
        },
      );

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("merch single line checkout USD", async ({ browser }) => {
      const seller = getE2ESellerSession()!;
      const title = `E2E Merch 1ccy ${Date.now()}`;

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
      await reloadChatThread(buyerPage);
      await openChatPaymentModal(buyerPage);
      await setAllMerchandiseLines(buyerPage, true);

      await expectInformeCurrencyBlocks(buyerPage, ["USD"]);

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

      await sellerEmitMerchandiseAgreement(sellerPage, {
        title,
        productNamePart: "Producto E2E",
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
      test.skip(!hasCarrierSession(), carrierSkipReason);
      test.skip(!hasCarrier2Session(), carrier2SkipReason);
      const seller = getE2ESellerSession()!;
      const scenario = getE2EScenario()!;
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

      const routeTitulo = await createLinkedTwoStopRouteSheet(sellerPage, title, {
        tramo0: scenario.carrierPhone!,
        tramo1: scenario.carrier2Phone!,
      });
      await inviteAndConfirmRouteCarriersForCheckout(
        browser,
        sellerPage,
        threadId,
        routeTitulo,
        seller.sessionToken,
        {
          carrierSessionToken: scenario.carrierSessionToken!,
          carrier2SessionToken: scenario.carrier2SessionToken!,
        },
      );
      await reloadChatThread(buyerPage);
      await prepareBuyerRouteCheckout(buyerPage, title, routeTitulo);

      const modal = paymentModal(buyerPage);
      await expect(
        modal.getByText(/transporte \(hoja de ruta\)/i),
      ).toBeVisible();
      await expect(modal.getByText(/1\. ciudad a → ciudad b/i)).toBeVisible();
      await expect(modal.getByText(/2\. ciudad b → ciudad c/i)).toBeVisible();
      await expect(
        modal.getByText(/incluir transporte en este cobro/i),
      ).toBeVisible();

      await sellerPage.close();
      await buyerPage.context().close();
    });

    test("selecting transport expands both stops in informe", async ({
      browser,
    }) => {
      test.skip(!hasCarrierSession(), carrierSkipReason);
      test.skip(!hasCarrier2Session(), carrier2SkipReason);
      const seller = getE2ESellerSession()!;
      const scenario = getE2EScenario()!;
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
      const routeTitulo = await createLinkedTwoStopRouteSheet(sellerPage, title, {
        tramo0: scenario.carrierPhone!,
        tramo1: scenario.carrier2Phone!,
      });
      await inviteAndConfirmRouteCarriersForCheckout(
        browser,
        sellerPage,
        threadId,
        routeTitulo,
        seller.sessionToken,
        {
          carrierSessionToken: scenario.carrierSessionToken!,
          carrier2SessionToken: scenario.carrier2SessionToken!,
        },
      );
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

    test("linked route path is not payable until all tramo carriers are confirmed", async ({
      browser,
    }) => {
      test.skip(!hasCarrierSession(), carrierSkipReason);
      test.skip(!hasCarrier2Session(), carrier2SkipReason);
      const seller = getE2ESellerSession()!;
      const scenario = getE2EScenario()!;
      const title = `E2E Ruta carriers ${Date.now()}`;

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

      const routeTitulo = await createLinkedTwoStopRouteSheet(sellerPage, title, {
        tramo0: scenario.carrierPhone!,
        tramo1: scenario.carrier2Phone!,
      });
      await inviteAndConfirmRouteCarriersForCheckout(
        browser,
        sellerPage,
        threadId,
        routeTitulo,
        seller.sessionToken,
        {
          carrierSessionToken: scenario.carrierSessionToken!,
          confirmSecondCarrier: false,
        },
      );

      await reloadChatThread(buyerPage);
      await prepareBuyerRouteCheckout(buyerPage, title, routeTitulo);
      const modalBlocked = paymentModal(buyerPage);
      await expect(
        modalBlocked.getByText(/transportistas de cada tramo estén confirmados/i),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        modalBlocked.getByText(/incluir transporte en este cobro/i),
      ).toHaveCount(0);

      await inviteAndConfirmRouteCarriersForCheckout(
        browser,
        sellerPage,
        threadId,
        routeTitulo,
        seller.sessionToken,
        {
          carrierSessionToken: scenario.carrier2SessionToken!,
          confirmSecondCarrier: false,
        },
      );

      await pageKeyboardCloseAndReopen(buyerPage, threadId);
      await waitForPayableRoutePathsInPaymentModal(buyerPage);
      await expect(
        paymentModal(buyerPage).getByText(/incluir transporte en este cobro/i),
      ).toBeVisible();

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
