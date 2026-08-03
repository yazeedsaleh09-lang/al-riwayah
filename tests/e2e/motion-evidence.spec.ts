import { expect, test, type Browser } from "@playwright/test";
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
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  if (viewport.width < 900) {
    const toggle = page.getByRole("button", { name: "افتح القائمة" });
    await toggle.click();
    await expect(page.locator("#mobile-menu")).toBeVisible();
    await page.keyboard.press("Escape");
  }

  for (const target of [
    page.getByRole("heading", { name: "اتفقوا على الرواية. ولا تختلفون." }),
    page.getByRole("heading", { name: "ثلاث خطوات واضحة." }),
    page.getByRole("heading", { name: "قضية بنك الساحة", exact: true }),
    page.getByRole("heading", { name: "جاهزين تبدأون؟" }),
  ]) {
    await target.scrollIntoViewIfNeeded();
    await expect(target).toBeVisible();
  }

  await context.close();
  await video?.saveAs(path.join(outputDir, name));
}

test("records the approved responsive homepage progression", async ({ browser, baseURL }) => {
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
