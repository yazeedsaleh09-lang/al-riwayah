import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, "../../artifacts/publishable-design-v3/directions");
const source = pathToFileURL(path.join(here, "directions.html")).href;
const directions = ["night", "seats", "call-sheet"];
const viewports = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const direction of directions) {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    await page.goto(`${source}?direction=${direction}`);
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.screenshot({
      path: path.join(output, `${direction}-${viewport.name}.png`),
    });
    await page.close();
  }
}

await browser.close();
