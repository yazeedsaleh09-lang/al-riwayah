import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

test("records the intentional homepage motion sequence", async ({ browser, baseURL }) => {
  const outputDir = path.resolve("artifacts", "final-playtest-pass", "motion");
  await mkdir(outputDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: outputDir, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  const video = page.video();

  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1_200);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(900);
  await expect(page.locator("main")).toBeVisible();
  await context.close();
  await video?.saveAs(path.join(outputDir, "homepage-motion.webm"));
});
