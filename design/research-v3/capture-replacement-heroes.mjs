import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, "../../artifacts/publishable-design-v3/replacement-heroes");
const source = pathToFileURL(path.join(here, "replacement-hero-concepts.html")).href;
const concepts = ["editor", "timeline", "relay"];
const viewports = [
  { name: "390x844", width: 390, height: 844 },
  { name: "1440x900", width: 1440, height: 900 },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const concept of concepts) {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      locale: "ar-SA",
      reducedMotion: "no-preference",
    });
    await page.goto(`${source}?concept=${concept}`);
    await page.waitForTimeout(1_200);
    await page.screenshot({
      path: path.join(output, `${concept}-${viewport.name}.png`),
      animations: "disabled",
    });
    await page.close();
  }
}

await browser.close();
