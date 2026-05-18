import fs from "node:fs";
import type { E2ESession } from "./Resources/e2e-api";
import { authenticateForE2E, isE2eApiReachable } from "./Resources/e2e-api";
import { e2eAuthDir, e2eSessionFile } from "./Resources/e2e-paths";

function writeSession(session: E2ESession): void {
  fs.mkdirSync(e2eAuthDir, { recursive: true });
  fs.writeFileSync(e2eSessionFile, JSON.stringify(session, null, 2), "utf8");
}

function clearSession(): void {
  if (fs.existsSync(e2eSessionFile)) {
    fs.unlinkSync(e2eSessionFile);
  }
}

export default async function globalSetup(): Promise<void> {
  if (process.env.PLAYWRIGHT_E2E_SKIP_AUTH === "1") {
    clearSession();
    return;
  }

  const manualToken = process.env.PLAYWRIGHT_E2E_TOKEN?.trim();
  if (manualToken) {
    writeSession({
      sessionToken: manualToken,
      userId: process.env.PLAYWRIGHT_E2E_USER_ID?.trim() ?? "",
      phone: process.env.PLAYWRIGHT_E2E_PHONE?.trim() ?? "",
      createdAt: new Date().toISOString(),
    });
    console.log("[e2e] Using PLAYWRIGHT_E2E_TOKEN from environment.");
    return;
  }

  if (!(await isE2eApiReachable())) {
    clearSession();
    console.warn(
      `[e2e] API not reachable at ${process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:5110"}; authenticated tests will skip.`,
    );
    return;
  }

  try {
    const session = await authenticateForE2E();
    writeSession(session);
    console.log(
      `[e2e] Authenticated via API (${session.phone}, user ${session.userId || "unknown"}).`,
    );
  } catch (err) {
    clearSession();
    console.warn("[e2e] API auth failed:", err);
  }
}
