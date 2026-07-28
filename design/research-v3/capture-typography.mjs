import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, "../../artifacts/publishable-design-v3/research");
const source = pathToFileURL(path.join(here, "typography-audition.html")).href;

await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  await page.goto(source);
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.screenshot({
    path: path.join(output, `arabic-typography-${viewport.name}.png`),
    fullPage: true,
  });
  await page.close();
}

await browser.close();
