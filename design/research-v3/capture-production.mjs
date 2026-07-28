import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, "../../artifacts/publishable-design-v3/after");
const baseUrl = globalThis.process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const allRoutes = [
  ["home", "/"],
  ["create", "/create"],
  ["join", "/join"],
  ["play", "/play"],
  ["how-to-play", "/how-to-play"],
  ["cases", "/cases"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["not-found", "/missing-design-review-route"],
];
const routeFilter = globalThis.process.env.CAPTURE_ROUTE;
const routes = routeFilter
  ? allRoutes.filter(([name]) => name === routeFilter)
  : allRoutes;
const viewports = [
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const [name, route] of routes) {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      locale: "ar-SA",
      reducedMotion: "no-preference",
    });
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.evaluate(() => globalThis.scrollTo(0, 0));
    await page.waitForTimeout(1_100);
    await page.screenshot({
      path: path.join(output, `${name}-fold-${viewport.name}.png`),
    });
    if (viewport.name === "390x844" || viewport.name === "1440x900") {
      await page.screenshot({
        path: path.join(output, `${name}-${viewport.name}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.close();
  }
}

await browser.close();
