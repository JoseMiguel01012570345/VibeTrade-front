export const e2eEnabled = process.env.PLAYWRIGHT_E2E === "1";
export const e2eToken = process.env.PLAYWRIGHT_E2E_TOKEN?.trim() ?? "";
export const e2eSkipReason =
  "Set PLAYWRIGHT_E2E=1 and PLAYWRIGHT_E2E_TOKEN to run integration E2E";

export function isE2EReady(): boolean {
  return e2eEnabled && e2eToken.length > 0;
}
