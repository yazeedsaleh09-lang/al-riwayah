import { defineConfig, devices } from "@playwright/test";

const WEB = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: WEB,
    trace: "retain-on-failure",
    locale: "ar",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "visual",
      use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 568 } },
    },
  ],
  // Reuses the running dev servers if present; otherwise starts them.
  webServer: [
    {
      command: "pnpm --filter @al-riwayah/server dev",
      port: 4000,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @al-riwayah/web dev",
      url: WEB,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
