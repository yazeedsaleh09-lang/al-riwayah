import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, "../../artifacts/publishable-design-v3/research");
const source = pathToFileURL(path.join(here, "logo-candidates.html")).href;

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(source);
  await page.screenshot({
    path: path.join(output, `logo-candidates-${viewport.name}.png`),
    fullPage: true,
  });
  await page.close();
}

await browser.close();
