import { chromium } from "@playwright/test";
import { access, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, "../../artifacts/publishable-design-v3/nudge-benchmark");
const referenceUrl = "https://nudge-folio.framer.website/";
const viewports = [
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const viewport of viewports) {
  const screenshotPath = path.join(output, `nudge-live-${viewport.name}.png`);
  try {
    await access(screenshotPath);
    continue;
  } catch {
    // Capture only viewports that do not already have verified direct-live evidence.
  }
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  await page.goto(referenceUrl, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.waitForTimeout(1_500);
  await page.screenshot({
    path: screenshotPath,
    animations: "disabled",
  });
  await page.close();
}

await browser.close();
