import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = pathToFileURL(path.join(here, "social-preview.html")).href;
const output = path.resolve(here, "../../apps/web/public/social-preview.png");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

await page.goto(source);
await page.screenshot({ path: output });
await browser.close();
