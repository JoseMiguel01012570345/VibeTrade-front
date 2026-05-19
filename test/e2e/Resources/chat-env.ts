import {
  e2eSellerToken,
  e2eToken,
  getE2EOfferId,
  getE2ESellerSession,
  getE2ESellerToken,
  getE2ESession,
  getE2EScenario,
  getE2EToken,
  isE2EReady,
  isE2ESellerReady,
} from "./env";

export {
  e2eToken,
  e2eSellerToken,
  getE2EToken,
  getE2ESellerToken,
  getE2ESession,
  getE2ESellerSession,
  getE2EScenario,
  getE2EOfferId,
};

export const e2eOfferId = getE2EOfferId();
export const e2eOfferServiceId =
  process.env.PLAYWRIGHT_E2E_OFFER_SERVICE_ID?.trim() ?? "";

/** True when global-setup wrote seller + buyer sessions (distinct). */
export function hasDistinctSellerSession(): boolean {
  const seller = getE2ESellerSession();
  const buyer = getE2ESession();
  if (!seller?.sessionToken) return false;
  if (!buyer?.sessionToken) return false;
  return seller.sessionToken !== buyer.sessionToken;
}

export function chatE2EReady(): boolean {
  return isE2EReady() && e2eOfferId.length > 0;
}

export function chatE2ESellerReady(): boolean {
  return chatE2EReady() && isE2ESellerReady();
}

export const chatE2ESkipReason =
  "Run npm run test:e2e with API on :5110 (global-setup provisions buyer, seller, and a published offer)";

export const chatE2ESellerSkipReason =
  "global-setup must provision seller and buyer (check test/e2e/.auth/scenario.json)";
