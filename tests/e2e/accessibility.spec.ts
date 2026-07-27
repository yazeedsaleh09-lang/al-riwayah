import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_ROUTES = ["/", "/how-to-play", "/cases", "/join", "/play", "/create", "/privacy", "/terms"];

test.describe("accessibility smoke (axe)", () => {
  for (const path of PUBLIC_ROUTES) {
    test(`no serious/critical axe violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const seriousOrCritical = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      if (seriousOrCritical.length > 0) {
        console.error(
          seriousOrCritical.map((v) => `${v.id} (${v.impact}): ${v.help}`).join("\n"),
        );
      }
      expect(seriousOrCritical).toEqual([]);
    });
  }

  test("mute and reduced-motion preferences persist and remain keyboard reachable", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const mobileMenu = page.getByRole("button", { name: "القائمة" });
    if (await mobileMenu.isVisible()) await mobileMenu.click();
    const visiblePreferences = page.locator(".prefs:visible");
    const sound = visiblePreferences.locator(".prefs__btn").first();
    const motion = visiblePreferences.locator(".prefs__btn").nth(1);

    await sound.focus();
    await expect(sound).toBeFocused();
    await sound.press("Enter");
    await expect(sound).toHaveAttribute("aria-pressed", "true");

    await motion.focus();
    await motion.press("Enter");
    await expect(motion).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const reloadedMobileMenu = page.getByRole("button", { name: "القائمة" });
    if (await reloadedMobileMenu.isVisible()) await reloadedMobileMenu.click();
    await expect(page.locator(".prefs:visible .prefs__btn").first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  });
});
