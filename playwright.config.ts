import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./test/e2e/test-feats",
  testMatch: "**/*.spec.ts",
  globalSetup: "./test/e2e/global-setup.ts",
  globalTimeout: 10_800_000,
  timeout: 60_000,
  // fullyParallel: false,
  // workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    ...(process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : {}),
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /chat-route-logistics/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-logistics",
      testMatch: /chat-route-logistics/,
      fullyParallel: false,
      workers: 1,
      timeout: 480_000,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          VITE_E2E_SKIP_QR: "1",
        },
      },
});
