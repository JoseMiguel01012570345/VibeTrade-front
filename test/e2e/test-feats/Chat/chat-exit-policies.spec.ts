import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  e2eOfferId,
  getE2EScenario,
  getE2ESellerSession,
  getE2EToken,
  hasDistinctSellerSession,
  hasCarrier2Session,
  carrier2SkipReason,
} from "../../Resources/chat-env";
import {
  rsReady,
  rsSkipReason,
  hasCarrierSession,
  carrierSkipReason,
} from "../../Resources/route-sheet-carriers-env";
import {
  fetchStoreTrustScore,
  fetchUserTrustScore,
  PARTY_EXIT_TRUST_PER_MEMBER,
  SELLER_HELD_EXIT_PENALTY,
  CARRIER_EXIT_PER_STOP,
} from "../../Resources/e2e-trust-api";
import {
  assertNoNativeDialogDuring,
  carrierWithdrawViaChatListUI,
  confirmChatLeaveFirstStep,
  expectLeaveBlockedInModal,
  expectLeaveSuccessToast,
  expectThreadAbsentFromChatList,
  expectThreadPresentInChatList,
  fillChatLeaveReasonModal,
  openChatLeaveFlow,
  partySoftLeaveViaChatListUI,
} from "../../Resources/exit-policies-ui-helpers";
import {
  openAuthenticatedChatListPage,
  payHeldMerchandiseAgreement,
  payHeldServiceAgreement,
  scenarioBuyerUserId,
  scenarioCarrierUserId,
  scenarioSellerStoreId,
  setupAcceptedMerchandiseAgreementNoPayments,
  setupAcceptedServiceAgreementNoPayments,
  setupPaidRouteForExitPolicies,
  setupRouteWithConfirmedCarriers,
  submitServiceEvidencePendingViaUI,
  acceptServiceEvidenceViaUI,
} from "../../Resources/e2e-exit-policies-env";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { reloadChatThread } from "../../Resources/chat-helpers";

test.describe("chat exit policies — party soft leave & carrier withdraw", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test.describe("comprador", () => {
    test("E-B01: party soft leave acuerdo servicio sin pagos (−3)", async ({
      browser,
    }) => {
      const s = await setupAcceptedServiceAgreementNoPayments(
        browser,
        e2eOfferId,
        getE2EToken(),
        { titlePrefix: "E-B01" },
      );
      const buyerList = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      const before = await fetchUserTrustScore(buyerList, scenarioBuyerUserId());

      await assertNoNativeDialogDuring(buyerList, async () => {
        await partySoftLeaveViaChatListUI(
          buyerList,
          s.threadId,
          "Motivo E2E comprador B01",
        );
      });

      await expectLeaveSuccessToast(
        buyerList,
        new RegExp(`−${PARTY_EXIT_TRUST_PER_MEMBER}|se ajustó`, "i"),
      );
      await expectThreadAbsentFromChatList(buyerList, s.threadId);
      const after = await fetchUserTrustScore(buyerList, scenarioBuyerUserId());
      expect(after).toBe(before - PARTY_EXIT_TRUST_PER_MEMBER);
      await buyerList.context().close();
    });

    test("E-B04: party soft leave bloqueado con pago Held (servicio)", async ({
      browser,
    }) => {
      const s = await setupAcceptedServiceAgreementNoPayments(
        browser,
        e2eOfferId,
        getE2EToken(),
        { titlePrefix: "E-B04" },
      );
      const buyerPage = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      await buyerPage.goto(`/chat/${s.threadId}`, {
        waitUntil: "domcontentloaded",
      });
      await payHeldServiceAgreement(
        buyerPage,
        s.threadId,
        s.serviceNamePart ?? "Consultoría E2E",
      );
      await openChatLeaveFlow(buyerPage, s.threadId);
      await confirmChatLeaveFirstStep(buyerPage);
      await fillChatLeaveReasonModal(buyerPage, "Motivo held B04");
      await expectLeaveBlockedInModal(buyerPage, /held|retenido|pagos/i);
      await expectThreadPresentInChatList(buyerPage, s.threadId);
      await buyerPage.context().close();
    });

    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);

    test("E-B02: party soft leave con 1 carrier confirmado (−6)", async ({
      browser,
    }) => {
      const route = await setupRouteWithConfirmedCarriers(browser, {
        tituloPrefix: "E-B02",
        tramoCount: 1,
      });
      const buyerList = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      const before = await fetchUserTrustScore(buyerList, scenarioBuyerUserId());
      await partySoftLeaveViaChatListUI(
        buyerList,
        route.threadId,
        "Motivo E2E B02",
      );
      await expectLeaveSuccessToast(buyerList, /−6|se ajustó/i);
      const after = await fetchUserTrustScore(buyerList, scenarioBuyerUserId());
      expect(after).toBe(before - PARTY_EXIT_TRUST_PER_MEMBER * 2);
      await buyerList.context().close();
    });

    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    test("E-B03: party soft leave con 2 carriers (−9)", async ({
      browser,
    }) => {
      const scenario = getE2EScenario()!;
      const route = await setupRouteWithConfirmedCarriers(browser, {
        tituloPrefix: "E-B03",
        tramoCount: 2,
        carrier2Phone: scenario.carrier2Phone,
      });
      const buyerList = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      const before = await fetchUserTrustScore(buyerList, scenarioBuyerUserId());
      await partySoftLeaveViaChatListUI(
        buyerList,
        route.threadId,
        "Motivo E2E B03",
      );
      await expectLeaveSuccessToast(buyerList, /−9|se ajustó/i);
      const after = await fetchUserTrustScore(buyerList, scenarioBuyerUserId());
      expect(after).toBe(before - PARTY_EXIT_TRUST_PER_MEMBER * 3);
      await buyerList.context().close();
    });

    test("E-B06: party soft leave bloqueado con tramo pagado", async ({
      browser,
    }) => {
      const route = await setupPaidRouteForExitPolicies(browser, {
        tituloPrefix: "E-B06",
        tramoCount: 1,
        payRoutes: true,
      });
      const buyerList = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      await openChatLeaveFlow(buyerList, route.threadId);
      await confirmChatLeaveFirstStep(buyerList);
      await fillChatLeaveReasonModal(buyerList, "Motivo B06");
      await expectLeaveBlockedInModal(
        buyerList,
        /entregas activas|reembolso|route_delivery_active_buyer/i,
      );
      await expectThreadPresentInChatList(buyerList, route.threadId);
      await buyerList.context().close();
    });

    test("E-B05: party soft leave bloqueado pago Held mercancía", async ({
      browser,
    }) => {
      const s = await setupAcceptedMerchandiseAgreementNoPayments(
        browser,
        e2eOfferId,
        getE2EToken(),
        { titlePrefix: "E-B05" },
      );
      const buyerPage = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      await buyerPage.goto(`/chat/${s.threadId}`, {
        waitUntil: "domcontentloaded",
      });
      await payHeldMerchandiseAgreement(buyerPage);
      await openChatLeaveFlow(buyerPage, s.threadId);
      await confirmChatLeaveFirstStep(buyerPage);
      await fillChatLeaveReasonModal(buyerPage, "Motivo held B05");
      await expectLeaveBlockedInModal(buyerPage, /held|retenido|pagos/i);
      await buyerPage.context().close();
    });
  });

  test.describe("tienda", () => {
    test("E-S01: party soft leave acuerdo aceptado sin pagos (−3 tienda)", async ({
      browser,
    }) => {
      const s = await setupAcceptedServiceAgreementNoPayments(
        browser,
        e2eOfferId,
        getE2EToken(),
        { titlePrefix: "E-S01" },
      );
      const seller = getE2ESellerSession()!;
      const sellerList = await openAuthenticatedChatListPage(
        browser,
        seller.sessionToken,
      );
      const storeId = scenarioSellerStoreId();
      const before = await fetchStoreTrustScore(sellerList, storeId);
      await partySoftLeaveViaChatListUI(
        sellerList,
        s.threadId,
        "Motivo E2E vendedor S01",
      );
      await expectLeaveSuccessToast(sellerList, /confianza de tu tienda|−3/i);
      const after = await fetchStoreTrustScore(sellerList, storeId);
      expect(after).toBe(before - PARTY_EXIT_TRUST_PER_MEMBER);
      await sellerList.context().close();
    });

    test("E-S06: party soft leave bloqueado evidencia pendiente (servicio)", async ({
      browser,
    }) => {
      const s = await setupAcceptedServiceAgreementNoPayments(
        browser,
        e2eOfferId,
        getE2EToken(),
        { titlePrefix: "E-S06 svc" },
      );
      const buyerPage = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      await buyerPage.goto(`/chat/${s.threadId}`, {
        waitUntil: "domcontentloaded",
      });
      await payHeldServiceAgreement(
        buyerPage,
        s.threadId,
        s.serviceNamePart ?? "Consultoría E2E",
      );
      await buyerPage.context().close();

      const seller = getE2ESellerSession()!;
      const sellerPage = await openSellerPage(
        browser,
        seller.sessionToken,
        s.threadId,
      );
      await submitServiceEvidencePendingViaUI(sellerPage, s.agreementTitle);
      const sellerList = await openAuthenticatedChatListPage(
        browser,
        seller.sessionToken,
      );
      await openChatLeaveFlow(sellerList, s.threadId);
      await confirmChatLeaveFirstStep(sellerList);
      await fillChatLeaveReasonModal(sellerList, "Motivo S06");
      await expectLeaveBlockedInModal(sellerList, /evidencia|pendiente/i);
      await sellerList.context().close();
      await sellerPage.close();
    });

    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);
    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    test("E-S03: party soft leave con 2 carriers (−9 tienda)", async ({
      browser,
    }) => {
      const scenario = getE2EScenario()!;
      const route = await setupRouteWithConfirmedCarriers(browser, {
        tituloPrefix: "E-S03",
        tramoCount: 2,
        carrier2Phone: scenario.carrier2Phone,
      });
      const seller = getE2ESellerSession()!;
      const sellerList = await openAuthenticatedChatListPage(
        browser,
        seller.sessionToken,
      );
      const storeId = scenarioSellerStoreId();
      const before = await fetchStoreTrustScore(sellerList, storeId);
      await partySoftLeaveViaChatListUI(
        sellerList,
        route.threadId,
        "Motivo E2E S03",
      );
      const after = await fetchStoreTrustScore(sellerList, storeId);
      expect(after).toBe(before - PARTY_EXIT_TRUST_PER_MEMBER * 3);
      await sellerList.context().close();
    });

    test("E-S08: party soft leave bloqueado tramo pagado (vendedor)", async ({
      browser,
    }) => {
      const route = await setupPaidRouteForExitPolicies(browser, {
        tituloPrefix: "E-S08",
        payRoutes: true,
      });
      const seller = getE2ESellerSession()!;
      const sellerList = await openAuthenticatedChatListPage(
        browser,
        seller.sessionToken,
      );
      await openChatLeaveFlow(sellerList, route.threadId);
      await confirmChatLeaveFirstStep(sellerList);
      await fillChatLeaveReasonModal(sellerList, "Motivo S08");
      await expectLeaveBlockedInModal(
        sellerList,
        /entregas activas|route_delivery_active_seller/i,
      );
      await sellerList.context().close();
    });

    test("E-S04: party soft leave con Held servicio (−15 tienda)", async ({
      browser,
    }) => {
      const s = await setupAcceptedServiceAgreementNoPayments(
        browser,
        e2eOfferId,
        getE2EToken(),
        { titlePrefix: "E-S04" },
      );
      const buyerPage = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      await buyerPage.goto(`/chat/${s.threadId}`, {
        waitUntil: "domcontentloaded",
      });
      await payHeldServiceAgreement(
        buyerPage,
        s.threadId,
        s.serviceNamePart ?? "Consultoría E2E",
      );
      await buyerPage.context().close();

      const seller = getE2ESellerSession()!;
      const sellerList = await openAuthenticatedChatListPage(
        browser,
        seller.sessionToken,
      );
      const storeId = scenarioSellerStoreId();
      const before = await fetchStoreTrustScore(sellerList, storeId);
      await partySoftLeaveViaChatListUI(
        sellerList,
        s.threadId,
        "Motivo E2E S04 held",
      );
      const after = await fetchStoreTrustScore(sellerList, storeId);
      expect(after).toBe(before - SELLER_HELD_EXIT_PENALTY);
      await sellerList.context().close();
    });

    test("E-S05: party soft leave con Held mercancía (−15 tienda)", async ({
      browser,
    }) => {
      const s = await setupAcceptedMerchandiseAgreementNoPayments(
        browser,
        e2eOfferId,
        getE2EToken(),
        { titlePrefix: "E-S05" },
      );
      const buyerPage = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      await buyerPage.goto(`/chat/${s.threadId}`, {
        waitUntil: "domcontentloaded",
      });
      await payHeldMerchandiseAgreement(buyerPage);
      await buyerPage.context().close();

      const seller = getE2ESellerSession()!;
      const sellerList = await openAuthenticatedChatListPage(
        browser,
        seller.sessionToken,
      );
      const storeId = scenarioSellerStoreId();
      const before = await fetchStoreTrustScore(sellerList, storeId);
      await partySoftLeaveViaChatListUI(
        sellerList,
        s.threadId,
        "Motivo E2E S05 held",
      );
      const after = await fetchStoreTrustScore(sellerList, storeId);
      expect(after).toBe(before - SELLER_HELD_EXIT_PENALTY);
      await sellerList.context().close();
    });

    test("E-S07: party soft leave tras evidencia aceptada (servicio)", async ({
      browser,
    }) => {
      const s = await setupAcceptedServiceAgreementNoPayments(
        browser,
        e2eOfferId,
        getE2EToken(),
        { titlePrefix: "E-S07 svc" },
      );
      const buyerPage = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      await buyerPage.goto(`/chat/${s.threadId}`, {
        waitUntil: "domcontentloaded",
      });
      await payHeldServiceAgreement(
        buyerPage,
        s.threadId,
        s.serviceNamePart ?? "Consultoría E2E",
      );
      await buyerPage.context().close();

      const seller = getE2ESellerSession()!;
      const sellerPage = await openSellerPage(
        browser,
        seller.sessionToken,
        s.threadId,
      );
      await submitServiceEvidencePendingViaUI(sellerPage, s.agreementTitle);
      await sellerPage.close();

      const buyerEvidencePage = await openAuthenticatedChatListPage(
        browser,
        getE2EToken(),
      );
      await buyerEvidencePage.goto(`/chat/${s.threadId}`, {
        waitUntil: "domcontentloaded",
      });
      await reloadChatThread(buyerEvidencePage);
      await acceptServiceEvidenceViaUI(buyerEvidencePage, s.agreementTitle, {
        token: getE2EToken(),
        threadId: s.threadId,
        agreementId: s.agreementId,
      });
      await buyerEvidencePage.context().close();

      const sellerList = await openAuthenticatedChatListPage(
        browser,
        seller.sessionToken,
      );
      const storeId = scenarioSellerStoreId();
      const trustPage = await openAuthenticatedChatListPage(
        browser,
        seller.sessionToken,
      );
      const before = await fetchStoreTrustScore(trustPage, storeId);
      await partySoftLeaveViaChatListUI(
        sellerList,
        s.threadId,
        "Motivo E2E S07 ok",
      );
      const after = await fetchStoreTrustScore(trustPage, storeId);
      expect(after).toBeGreaterThanOrEqual(before - PARTY_EXIT_TRUST_PER_MEMBER);
      expect(after).toBeGreaterThan(before - SELLER_HELD_EXIT_PENALTY);
      await sellerList.context().close();
      await trustPage.context().close();
    });

    test("E-S02: party soft leave con 3 carriers (−12) — opcional", async ({
      browser,
    }) => {
      test.skip(true, "Requiere carrier3 en runtime; omitido hasta provisionarlo");
      const seller = getE2ESellerSession()!;
      const sellerList = await openAuthenticatedChatListPage(
        browser,
        seller.sessionToken,
      );
      await sellerList.context().close();
    });
  });

  test.describe("transportista", () => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);

    test("E-C01: carrier withdraw sin titularidad (−3)", async ({ browser }) => {
      const route = await setupRouteWithConfirmedCarriers(browser, {
        tituloPrefix: "E-C01",
      });
      const scenario = getE2EScenario()!;
      const carrierList = await openAuthenticatedChatListPage(
        browser,
        scenario.carrierSessionToken!,
      );
      const before = await fetchUserTrustScore(
        carrierList,
        scenarioCarrierUserId(),
      );

      await assertNoNativeDialogDuring(carrierList, async () => {
        await carrierWithdrawViaChatListUI(
          carrierList,
          route.threadId,
          "Motivo E2E carrier C01",
        );
      });

      await expectLeaveSuccessToast(carrierList, /−3|transportista/i);
      const after = await fetchUserTrustScore(
        carrierList,
        scenarioCarrierUserId(),
      );
      expect(after).toBe(before - CARRIER_EXIT_PER_STOP);
      await carrierList.context().close();
    });

    test("E-C03: carrier withdraw motivo vacío rechazado", async ({
      browser,
    }) => {
      const route = await setupRouteWithConfirmedCarriers(browser, {
        tituloPrefix: "E-C03",
      });
      const scenario = getE2EScenario()!;
      const carrierList = await openAuthenticatedChatListPage(
        browser,
        scenario.carrierSessionToken!,
      );
      await openChatLeaveFlow(carrierList, route.threadId);
      await confirmChatLeaveFirstStep(carrierList);
      await fillChatLeaveReasonModal(carrierList, "", { confirm: true });
      await expect(
        carrierList
          .getByRole("dialog")
          .filter({ has: carrierList.locator("#chat-leave-reason-title") }),
      ).toBeVisible();
      await expectThreadPresentInChatList(carrierList, route.threadId);
      await carrierList.context().close();
    });

    test("E-C02: carrier withdraw dos tramos confirmados (−6)", async ({
      browser,
    }) => {
      const route = await setupRouteWithConfirmedCarriers(browser, {
        tituloPrefix: "E-C02",
        tramoCount: 2,
      });
      const scenario = getE2EScenario()!;
      const carrierList = await openAuthenticatedChatListPage(
        browser,
        scenario.carrierSessionToken!,
      );
      const before = await fetchUserTrustScore(
        carrierList,
        scenarioCarrierUserId(),
      );
      await carrierWithdrawViaChatListUI(
        carrierList,
        route.threadId,
        "Motivo E2E C02",
      );
      await expectLeaveSuccessToast(carrierList, /−6|transportista|des-suscribiste/i);
      const after = await fetchUserTrustScore(
        carrierList,
        scenarioCarrierUserId(),
      );
      expect(after).toBe(before - CARRIER_EXIT_PER_STOP * 2);
      await carrierList.context().close();
    });

    test("E-C05: carrier withdraw bloqueado con titularidad de tramo", async ({
      browser,
    }) => {
      const route = await setupPaidRouteForExitPolicies(browser, {
        tituloPrefix: "E-C05",
        payRoutes: true,
      });
      const scenario = getE2EScenario()!;
      const carrierList = await openAuthenticatedChatListPage(
        browser,
        scenario.carrierSessionToken!,
      );
      await openChatLeaveFlow(carrierList, route.threadId);
      await confirmChatLeaveFirstStep(carrierList);
      await fillChatLeaveReasonModal(carrierList, "Motivo C05");
      await expect(
        carrierList
          .getByText(
            /carga asignada|transportista activo|carrier_holds_ownership|titularidad|no puedes salir|no podés salir/i,
          )
          .first(),
      ).toBeVisible({ timeout: 15_000 });
      await expectThreadPresentInChatList(carrierList, route.threadId);
      await carrierList.context().close();
    });
  });
});
