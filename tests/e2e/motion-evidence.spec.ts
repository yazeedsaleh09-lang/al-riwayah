import { test, expect, type Browser } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

async function recordHomepage(
  browser: Browser,
  baseURL: string,
  name: string,
  viewport: { width: number; height: number },
  reducedMotion: "reduce" | "no-preference",
) {
  const outputDir = path.resolve("artifacts", "final-playtest-pass", "motion");
  await mkdir(outputDir, { recursive: true });
  const context = await browser.newContext({
    viewport,
    reducedMotion,
    recordVideo: { dir: outputDir, size: viewport },
  });
  const page = await context.newPage();
  const video = page.video();

  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1_200);
  const scrubber = page.locator(".testimony-editor__scrubber");
  await scrubber.scrollIntoViewIfNeeded();
  const box = await scrubber.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.82, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width * 0.18, box.y + box.height / 2, { steps: 18 });
  }
  const range = page.getByLabel("قارن النسخة الأصلية بالنسخة المعدلة");
  await range.focus();
  await range.press("Home");
  await range.press("End");
  const tickerControl = page.getByRole("button", { name: "أوقف الشريط" });
  await tickerControl.scrollIntoViewIfNeeded();
  await tickerControl.click();
  await page.waitForTimeout(350);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(900);
  await expect(page.locator("main")).toBeVisible();
  await context.close();
  await video?.saveAs(path.join(outputDir, name));
}

test("records the intentional homepage motion sequence", async ({ browser, baseURL }) => {
  await recordHomepage(
    browser,
    baseURL!,
    "homepage-motion-390x844.webm",
    { width: 390, height: 844 },
    "no-preference",
  );
  await recordHomepage(
    browser,
    baseURL!,
    "homepage-motion-1440x900.webm",
    { width: 1440, height: 900 },
    "no-preference",
  );
  await recordHomepage(
    browser,
    baseURL!,
    "homepage-reduced-motion-390x844.webm",
    { width: 390, height: 844 },
    "reduce",
  );
});
