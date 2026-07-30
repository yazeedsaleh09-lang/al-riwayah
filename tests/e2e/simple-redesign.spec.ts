import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUTPUT = process.env.SIMPLE_RELEASE_GATE === "1"
  ? path.resolve("artifacts", "simple-release-gate", "screenshots")
  : path.resolve("artifacts", "simple-redesign", "screenshots");

async function capture(
  page: Page,
  route: string,
  name: string,
  width: number,
  height: number,
) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("h1").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: path.join(OUTPUT, name), animations: "disabled" });
}

test("captures the strict simple public surfaces", async ({ page }) => {
  await mkdir(OUTPUT, { recursive: true });
  await capture(page, "/", "homepage-1440x900.png", 1440, 900);
  await capture(page, "/", "homepage-390x844.png", 390, 844);
  await capture(page, "/how-to-play", "how-to-play-desktop.png", 1440, 900);
  await capture(page, "/how-to-play", "how-to-play-mobile.png", 390, 844);
  await capture(page, "/cases", "cases-desktop.png", 1440, 900);
  await capture(page, "/about", "about-desktop.png", 1440, 900);
  await capture(page, "/create", "create-mobile.png", 390, 844);
  await capture(page, "/join", "join-mobile.png", 390, 844);
  await capture(page, "/room/NOPE", "invalid-room-mobile.png", 390, 844);
  await capture(page, "/privacy", "privacy-desktop.png", 1440, 900);
  await capture(page, "/privacy", "privacy-mobile.png", 390, 844);
  await capture(page, "/terms", "terms-desktop.png", 1440, 900);
  await capture(page, "/terms", "terms-mobile.png", 390, 844);
  await capture(page, "/definitely-not-a-real-route", "not-found-mobile.png", 390, 844);
});
