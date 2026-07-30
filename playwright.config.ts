import { defineConfig, devices } from "@playwright/test";

const WEB = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const WEB_PORT = Number(new URL(WEB).port || 3100);
const SERVER_PORT = Number(process.env.E2E_SERVER_PORT ?? 4100);
const SERVER = `http://127.0.0.1:${SERVER_PORT}`;
const PUBLIC_SERVER = process.env.E2E_PUBLIC_SERVER_URL ?? SERVER;
const PRODUCTION_WEB = process.env.E2E_PRODUCTION === "1";
const SERVER_BIND_HOST = process.env.E2E_SERVER_BIND_HOST ?? "127.0.0.1";
const WEB_BIND_HOST = process.env.E2E_WEB_BIND_HOST ?? "127.0.0.1";
const REUSE_EXISTING_SERVER = process.env.E2E_REUSE_SERVER === "1";
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

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
      testMatch: [
        "**/marketing.spec.ts",
        "**/accessibility.spec.ts",
        "**/identity-motion.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 568 } },
    },
  ],
  // Reuses the running dev servers if present; otherwise starts them.
  webServer: [
    {
      command: `${PNPM} --filter @al-riwayah/server start`,
      url: `${SERVER}/health`,
      env: {
        ...process.env,
        HOST: SERVER_BIND_HOST,
        PORT: String(SERVER_PORT),
        PHASE_DURATION_SCALE: process.env.E2E_PHASE_DURATION_SCALE ?? "0.2",
        E2E_FIXED_SEED: process.env.E2E_FIXED_SEED ?? "visual-1",
      },
      reuseExistingServer: REUSE_EXISTING_SERVER,
      timeout: 60_000,
    },
    {
      command: `node apps/web/node_modules/next/dist/bin/next ${PRODUCTION_WEB ? "start" : "dev"} apps/web -H ${WEB_BIND_HOST} -p ${WEB_PORT}`,
      url: WEB,
      env: {
        ...process.env,
        E2E_DEV: PRODUCTION_WEB ? "0" : "1",
        NEXT_PUBLIC_SERVER_URL: PRODUCTION_WEB
          ? process.env.NEXT_PUBLIC_SERVER_URL
          : PUBLIC_SERVER,
      },
      reuseExistingServer: REUSE_EXISTING_SERVER,
      timeout: 120_000,
    },
  ],
});
