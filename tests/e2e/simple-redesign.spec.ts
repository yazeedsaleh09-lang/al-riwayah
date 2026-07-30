import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUTPUT = path.resolve("artifacts", "nav-logo-motion-pass", "screenshots");

async function capture(
  page: Page,
  route: string,
  name: string,
  width: number,
  height: number,
) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("about:blank");
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.locator("h1").first()).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: path.join(OUTPUT, name), animations: "disabled" });
}

test("captures the canonical public navigation and logo surfaces", async ({ page }) => {
  await mkdir(OUTPUT, { recursive: true });
  await capture(page, "/", "homepage-1440x900.png", 1440, 900);
  await capture(page, "/cases", "cases-1440x900.png", 1440, 900);
  await capture(page, "/how-to-play", "how-to-play-1440x900.png", 1440, 900);
  await capture(page, "/about", "about-1440x900.png", 1440, 900);
  await capture(page, "/create", "create-1440x900.png", 1440, 900);
  await capture(page, "/join", "join-1440x900.png", 1440, 900);
  await capture(page, "/", "homepage-390x844.png", 390, 844);
  await capture(page, "/cases", "cases-390x844.png", 390, 844);
  await capture(page, "/create", "create-390x844.png", 390, 844);
  await capture(page, "/join", "join-390x844.png", 390, 844);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "افتح القائمة" }).click();
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await page.screenshot({
    path: path.join(OUTPUT, "mobile-menu-open-390x844.png"),
    animations: "disabled",
  });
});
