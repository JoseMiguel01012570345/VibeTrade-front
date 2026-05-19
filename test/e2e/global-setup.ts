import fs from "node:fs";
import { chromium } from "@playwright/test";
import type { E2ESession } from "./Resources/e2e-session";
import { provisionChatE2EScenario } from "./Resources/e2e-chat-scenario";
import type { E2EChatScenario } from "./Resources/e2e-chat-scenario";
import { isE2EAppReachable, loginUserViaUI } from "./Resources/e2e-ui-auth";
import {
  e2eAuthDir,
  e2eScenarioFile,
  e2eSellerSessionFile,
  e2eSessionFile,
} from "./Resources/e2e-paths";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

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

  if (!(await isE2EAppReachable(page, baseURL))) {
    await browser.close();
    clearSession();
    console.warn(
      `[e2e] App not reachable at ${baseURL}; authenticated tests will skip.`,
    );
    return;
  }

  try {
    const { seller, buyer, scenario } = await provisionChatE2EScenario(
      page,
      baseURL,
    );
    writeSession(e2eSellerSessionFile, seller);
    writeSession(e2eSessionFile, buyer);
    writeScenario(scenario);
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

  const sellerPhone = process.env.PLAYWRIGHT_E2E_SELLER_PHONE?.trim();
  if (!sellerPhone) return;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    if (!(await isE2EAppReachable(page, baseURL))) return;
    const session = await loginUserViaUI(page, baseURL, sellerPhone);
    writeSession(e2eSellerSessionFile, session);
    console.log(
      `[e2e] Seller authenticated via UI (${session.phone}, user ${session.userId || "unknown"}).`,
    );
  } catch (err) {
    console.warn("[e2e] Seller UI auth failed:", err);
  } finally {
    await browser.close();
  }
}
