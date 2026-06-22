import fs from "node:fs";
import { chromium } from "@playwright/test";
import type { E2ESession } from "./Resources/e2e-session";
import { provisionChatE2EScenario } from "./Resources/e2e-chat-scenario";
import type { E2EChatScenario } from "./Resources/e2e-chat-scenario";
import {
  isE2EAppReachable,
  loginUserViaUI,
  logoutViaUI,
  registerUserViaUI,
  waitForE2EStackReady,
} from "./Resources/e2e-ui-auth";
import {
  addServiceViaUI,
  createStoreViaUI,
  publishCatalogItemViaUI,
} from "./Resources/e2e-ui-store";
import {
  E2E_DEMO_CARD_LAST4,
  ensureStripeCustomerViaFetch,
  listStripeCardsViaFetch,
} from "./Resources/e2e-stripe-customer";
import {
  e2eAuthDir,
  e2eScenarioFile,
  e2eSellerSessionFile,
  e2eSessionFile,
} from "./Resources/e2e-paths";
import { getE2EApiBaseUrl, getE2EAppBaseUrl } from "./Resources/e2e-api-base";

const baseURL = getE2EAppBaseUrl();

function writeSession(path: string, session: E2ESession): void {
  fs.mkdirSync(e2eAuthDir, { recursive: true });
  fs.writeFileSync(path, JSON.stringify(session, null, 2), "utf8");
}

function writeScenario(scenario: E2EChatScenario): void {
  fs.mkdirSync(e2eAuthDir, { recursive: true });
  fs.writeFileSync(e2eScenarioFile, JSON.stringify(scenario, null, 2), "utf8");
}

function clearSession(): void {
  for (const file of [e2eSessionFile, e2eSellerSessionFile, e2eScenarioFile]) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
}

export default async function globalSetup(): Promise<void> {
  if (process.env.PLAYWRIGHT_E2E_SKIP_AUTH === "1") {
    clearSession();
    return;
  }

  const manualBuyerToken = process.env.PLAYWRIGHT_E2E_TOKEN?.trim();
  if (manualBuyerToken) {
    writeSession(e2eSessionFile, {
      sessionToken: manualBuyerToken,
      userId: process.env.PLAYWRIGHT_E2E_USER_ID?.trim() ?? "",
      phone: process.env.PLAYWRIGHT_E2E_PHONE?.trim() ?? "",
      createdAt: new Date().toISOString(),
    });
    console.log("[e2e] Using PLAYWRIGHT_E2E_TOKEN from environment.");
    await setupSellerSessionManual();
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const stackError = await waitForE2EStackReady(page, baseURL);
  if (stackError) {
    await browser.close();
    clearSession();
    console.warn(`[e2e] ${stackError}`);
    console.warn(
      `[e2e] Authenticated tests will skip until both frontend (:5173) and API (:5110) are up.`,
    );
    return;
  }

  try {
    const { seller, buyer, scenario } = await provisionChatE2EScenario(
      page,
      baseURL,
    );

    let rsProvisioned = false;
    let priorLogisticsCursor = 0;
    try {
      if (fs.existsSync(e2eScenarioFile)) {
        const existing = JSON.parse(
          fs.readFileSync(e2eScenarioFile, "utf8"),
        ) as E2EChatScenario;
        priorLogisticsCursor = existing.logisticsAgreementCursor ?? 0;
      }
    } catch {
      priorLogisticsCursor = 0;
    }

    try {
      const rsScenario = await provisionRouteSheetScenario(
        baseURL,
        seller.sessionToken,
        buyer.sessionToken,
        scenario.offerId,
      );
      scenario.routeSheetThreadId = rsScenario.threadId;
      scenario.routeSheetAgreementId = rsScenario.agreementId;
      scenario.routeSheetAgreementIds = rsScenario.agreementIds;
      rsProvisioned = true;
      console.log(
        `[e2e] Route sheet thread: ${rsScenario.threadId} — agreement: ${rsScenario.agreementId}`,
      );
    } catch (rsErr) {
      console.warn("[e2e] Route sheet scenario provisioning failed (non-fatal):", rsErr);
    }

    try {
      const carrierScenario = await provisionCarrierScenario(page, baseURL);
      scenario.carrierSessionToken = carrierScenario.sessionToken;
      scenario.carrierUserId = carrierScenario.userId;
      scenario.carrierStoreId = carrierScenario.storeId;
      scenario.carrierServiceId = carrierScenario.serviceId;
      scenario.carrierPhone = carrierScenario.phone;
      console.log(
        `[e2e] Carrier: ${carrierScenario.phone} (user ${carrierScenario.userId}) — store ${carrierScenario.storeId}`,
      );
      try {
        const carrier2Scenario = await provisionCarrierScenario(page, baseURL);
        scenario.carrier2SessionToken = carrier2Scenario.sessionToken;
        scenario.carrier2UserId = carrier2Scenario.userId;
        scenario.carrier2StoreId = carrier2Scenario.storeId;
        scenario.carrier2ServiceId = carrier2Scenario.serviceId;
        scenario.carrier2Phone = carrier2Scenario.phone;
        console.log(
          `[e2e] Carrier2: ${carrier2Scenario.phone} (user ${carrier2Scenario.userId})`,
        );
      } catch (carrier2Err) {
        console.warn("[e2e] Carrier2 provisioning failed (non-fatal):", carrier2Err);
      }
    } catch (carrierErr) {
      console.warn("[e2e] Carrier scenario provisioning failed (non-fatal):", carrierErr);
    }

    writeSession(e2eSellerSessionFile, seller);
    writeSession(e2eSessionFile, buyer);
    writeScenario({
      ...scenario,
      logisticsAgreementCursor: rsProvisioned ? 0 : priorLogisticsCursor,
    });

    const stripeCustomerOk = await ensureStripeCustomerViaFetch(
      buyer.sessionToken,
      baseURL,
    );
    if (stripeCustomerOk) {
      const cards = await listStripeCardsViaFetch(buyer.sessionToken, baseURL);
      if (cards.length > 0) {
        console.log(
          `[e2e] Buyer payment card ready (${cards[0]?.brand ?? "card"} •••• ${cards[0]?.last4 ?? E2E_DEMO_CARD_LAST4}).`,
        );
      } else {
        console.warn(
          "[e2e] Buyer Stripe customer exists but payment-methods returned no cards; rebuild/restart API with VIBETRADE_SKIP_PAYMENT_INTENTS=true.",
        );
      }
    } else {
      console.warn(
        "[e2e] Buyer Stripe customer setup failed; payment E2E tests may skip.",
      );
    }

    console.log(
      `[e2e] Seller: ${seller.phone} (user ${seller.userId}) — store ${scenario.storeId}`,
    );
    console.log(`[e2e] Buyer: ${buyer.phone} (user ${buyer.userId})`);
    console.log(`[e2e] Published offer (product id): ${scenario.offerId}`);
  } catch (err) {
    clearSession();
    console.warn("[e2e] Chat scenario provisioning failed:", err);
  } finally {
    await browser.close();
  }
}

async function provisionRouteSheetScenario(
  _baseURL: string,
  sellerToken: string,
  buyerToken: string,
  offerId: string,
): Promise<{ threadId: string; agreementId: string; agreementIds: string[] }> {
  const apiBase = getE2EApiBaseUrl();

  const buyerHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${buyerToken}`,
  };
  const sellerHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sellerToken}`,
  };

  const threadRes = await fetch(`${apiBase}/api/v1/chat/threads`, {
    method: "POST",
    headers: buyerHeaders,
    body: JSON.stringify({ offerId, purchaseIntent: true, forceNew: false }),
  });
  if (!threadRes.ok) {
    const body = await threadRes.text().catch(() => "");
    throw new Error(`Thread creation failed: ${threadRes.status} — ${body}`);
  }
  const threadJson = (await threadRes.json()) as Record<string, unknown>;
  const threadId = String(threadJson["id"] ?? threadJson["threadId"] ?? "").trim();
  if (!threadId || !threadId.startsWith("cth_")) {
    throw new Error(`Thread ID missing or invalid from response: ${JSON.stringify(threadJson)}`);
  }
  console.log(`[e2e] RS provisioning: thread=${threadId}`);

  const msgRes = await fetch(
    `${apiBase}/api/v1/chat/threads/${encodeURIComponent(threadId)}/messages`,
    {
      method: "POST",
      headers: buyerHeaders,
      body: JSON.stringify({ text: "Hola, me interesa tu oferta (E2E setup)" }),
    },
  );
  if (!msgRes.ok) {
    const body = await msgRes.text().catch(() => "");
    throw new Error(`First message send failed: ${msgRes.status} — ${body}`);
  }

  const merchandiseLine = {
    tipo: "Producto de transporte E2E",
    cantidad: "1",
    valorUnitario: "100",
    estado: "nuevo",
    descuento: "",
    impuestos: "",
    moneda: "USD",
    tipoEmbalaje: "",
    devolucionesDesc: "",
    devolucionQuienPaga: "",
    devolucionPlazos: "",
    regulaciones: "",
  };

  async function createAndAcceptAgreement(index: number): Promise<string> {
    const agTitle = `E2E-RS-AGR-${index}-${Date.now()}`;
    const agPayload = {
      title: agTitle,
      includeMerchandise: true,
      includeService: false,
      merchandise: [merchandiseLine],
      services: [],
    };
    const agRes = await fetch(
      `${apiBase}/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements`,
      { method: "POST", headers: sellerHeaders, body: JSON.stringify(agPayload) },
    );
    if (!agRes.ok) {
      const body = await agRes.text().catch(() => "");
      throw new Error(`Agreement creation failed [${index}]: ${agRes.status} — ${body}`);
    }
    const agJson = (await agRes.json()) as Record<string, unknown>;
    const id = String(agJson["id"] ?? agJson["agreementId"] ?? "").trim();
    if (!id) throw new Error(`Agreement ID missing [${index}]: ${JSON.stringify(agJson)}`);

    const acceptRes = await fetch(
      `${apiBase}/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements/${encodeURIComponent(id)}/respond`,
      { method: "POST", headers: buyerHeaders, body: JSON.stringify({ accept: true }) },
    );
    if (!acceptRes.ok) {
      const body = await acceptRes.text().catch(() => "");
      throw new Error(`Agreement accept failed [${index}]: ${acceptRes.status} — ${body}`);
    }
    console.log(`[e2e] RS provisioning: agreement[${index}]=${id}`);
    return id;
  }

  /** Enough agreements for the full serial logistics suite (L-15 consumes two). */
  const agreementCount = 45;
  const agreementIds: string[] = [];
  for (let i = 0; i < agreementCount; i++) {
    agreementIds.push(await createAndAcceptAgreement(i));
  }
  const agreementId = agreementIds[0]!;

  return { threadId, agreementId, agreementIds };
}

type CarrierScenario = {
  sessionToken: string;
  userId: string;
  phone: string;
  storeId: string;
  serviceId: string;
};

async function provisionCarrierScenario(
  page: import("@playwright/test").Page,
  url: string,
): Promise<CarrierScenario> {
  await logoutViaUI(page, url);
  const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const storeName = `Transportista E2E ${suffix}`;
  const serviceType = `Servicio de Transporte E2E ${suffix}`;

  const carrier = await registerUserViaUI(page, url);
  if (!carrier.userId) {
    throw new Error("carrier user id missing after UI registration");
  }

  const storeId = await createStoreViaUI(page, url, storeName);
  const serviceId = await addServiceViaUI(page, url, storeId, serviceType);
  await publishCatalogItemViaUI(page, serviceType);

  await logoutViaUI(page, url);

  return {
    sessionToken: carrier.sessionToken,
    userId: carrier.userId,
    phone: carrier.phone,
    storeId,
    serviceId,
  };
}

async function setupSellerSessionManual(): Promise<void> {
  const manualSellerToken = process.env.PLAYWRIGHT_E2E_SELLER_TOKEN?.trim();
  if (manualSellerToken) {
    writeSession(e2eSellerSessionFile, {
      sessionToken: manualSellerToken,
      userId: process.env.PLAYWRIGHT_E2E_SELLER_USER_ID?.trim() ?? "",
      phone: process.env.PLAYWRIGHT_E2E_SELLER_PHONE?.trim() ?? "",
      createdAt: new Date().toISOString(),
    });
    console.log("[e2e] Using PLAYWRIGHT_E2E_SELLER_TOKEN from environment.");
    return;
  }

  const sellerEmail = process.env.PLAYWRIGHT_E2E_SELLER_EMAIL?.trim();
  const sellerPassword = process.env.PLAYWRIGHT_E2E_SELLER_PASSWORD?.trim();
  if (!sellerEmail || !sellerPassword) return;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    if (!(await isE2EAppReachable(page, baseURL))) return;
    const session = await loginUserViaUI(
      page,
      baseURL,
      sellerEmail,
      sellerPassword,
    );
    writeSession(e2eSellerSessionFile, session);
    console.log(
      `[e2e] Seller authenticated via UI (${session.email ?? sellerEmail}, user ${session.userId || "unknown"}).`,
    );
  } catch (err) {
    console.warn("[e2e] Seller UI auth failed:", err);
  } finally {
    await browser.close();
  }
}
