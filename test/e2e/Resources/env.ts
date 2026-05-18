import fs from "node:fs";
import type { E2ESession } from "./e2e-api";
import { e2eSessionFile } from "./e2e-paths";

export const e2eSkipReason =
  "Start the backend on :5110 (Auth:ExposeDevCodes=true) before npm run test:e2e, or set PLAYWRIGHT_E2E_TOKEN";

let cachedSession: E2ESession | null | undefined;

function readSessionFile(): E2ESession | null {
  if (!fs.existsSync(e2eSessionFile)) return null;
  try {
    const raw = fs.readFileSync(e2eSessionFile, "utf8");
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

  cachedSession = readSessionFile();
  return cachedSession;
}

export function isE2EReady(): boolean {
  return (getE2ESession()?.sessionToken.length ?? 0) > 0;
}
