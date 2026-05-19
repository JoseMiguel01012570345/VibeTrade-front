import fs from "node:fs";
import type { E2ESession } from "./e2e-session";
import type { E2EChatScenario } from "./e2e-chat-scenario";
import { e2eScenarioFile, e2eSellerSessionFile, e2eSessionFile } from "./e2e-paths";

export const e2eSkipReason =
  "Start the backend on :5110 (Auth:ExposeDevCodes=true) before npm run test:e2e, or set PLAYWRIGHT_E2E_TOKEN";

let cachedSession: E2ESession | null | undefined;
let cachedSellerSession: E2ESession | null | undefined;
let cachedScenario: E2EChatScenario | null | undefined;

function readSessionFile(path: string): E2ESession | null {
  if (!fs.existsSync(path)) return null;
  try {
    const raw = fs.readFileSync(path, "utf8");
    const json = JSON.parse(raw) as E2ESession;
    if (typeof json.sessionToken === "string" && json.sessionToken.length > 0) {
      return json;
    }
  } catch {
    /* ignore corrupt file */
  }
  return null;
}

export function getE2ESession(): E2ESession | null {
  if (cachedSession !== undefined) return cachedSession;

  const manualToken = process.env.PLAYWRIGHT_E2E_TOKEN?.trim();
  if (manualToken) {
    cachedSession = {
      sessionToken: manualToken,
      userId: process.env.PLAYWRIGHT_E2E_USER_ID?.trim() ?? "",
      phone: process.env.PLAYWRIGHT_E2E_PHONE?.trim() ?? "",
      createdAt: "",
    };
    return cachedSession;
  }

  cachedSession = readSessionFile(e2eSessionFile);
  return cachedSession;
}

export function getE2ESellerSession(): E2ESession | null {
  if (cachedSellerSession !== undefined) return cachedSellerSession;

  const manualToken = process.env.PLAYWRIGHT_E2E_SELLER_TOKEN?.trim();
  if (manualToken) {
    cachedSellerSession = {
      sessionToken: manualToken,
      userId: process.env.PLAYWRIGHT_E2E_SELLER_USER_ID?.trim() ?? "",
      phone: process.env.PLAYWRIGHT_E2E_SELLER_PHONE?.trim() ?? "",
      createdAt: "",
    };
    return cachedSellerSession;
  }

  cachedSellerSession = readSessionFile(e2eSellerSessionFile);
  return cachedSellerSession;
}

/** Session token from global-setup (or PLAYWRIGHT_E2E_TOKEN). */
export function getE2EToken(): string {
  return getE2ESession()?.sessionToken ?? "";
}

/** Seller token from global-setup, env override, or same as buyer when unset. */
export function getE2ESellerToken(): string {
  return getE2ESellerSession()?.sessionToken ?? getE2EToken();
}

export const e2eToken = getE2EToken();
export const e2eSellerToken = getE2ESellerToken();

export function isE2EReady(): boolean {
  return getE2EToken().length > 0;
}

export function isE2ESellerReady(): boolean {
  return getE2ESellerToken().length > 0;
}

export function getE2EScenario(): E2EChatScenario | null {
  if (cachedScenario !== undefined) return cachedScenario;
  if (!fs.existsSync(e2eScenarioFile)) {
    cachedScenario = null;
    return null;
  }
  try {
    cachedScenario = JSON.parse(
      fs.readFileSync(e2eScenarioFile, "utf8"),
    ) as E2EChatScenario;
    if (!cachedScenario?.offerId?.trim() || !cachedScenario?.productId2?.trim()) {
      cachedScenario = null;
    }
  } catch {
    cachedScenario = null;
  }
  return cachedScenario;
}

/** Offer id: env override o producto publicado por global-setup. */
export function getE2EOfferId(): string {
  const fromEnv = process.env.PLAYWRIGHT_E2E_OFFER_ID?.trim();
  if (fromEnv) return fromEnv;
  return getE2EScenario()?.offerId ?? "";
}

/** Store id: env override o tienda del escenario global-setup. */
export function getE2EStoreId(): string {
  const fromEnv = process.env.PLAYWRIGHT_E2E_STORE_ID?.trim();
  if (fromEnv) return fromEnv;
  return getE2EScenario()?.storeId ?? "";
}
