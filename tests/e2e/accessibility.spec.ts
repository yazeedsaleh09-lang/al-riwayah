import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_ROUTES = [
  "/",
  "/how-to-play",
  "/cases",
  "/join",
  "/play",
  "/create",
  "/privacy",
  "/terms",
];

test.describe("accessibility smoke (axe)", () => {
  for (const path of PUBLIC_ROUTES) {
    test(`no serious/critical axe violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const seriousOrCritical = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      if (seriousOrCritical.length > 0) {
        console.error(
          seriousOrCritical
            .map(
              (v) =>
                `${v.id} (${v.impact}): ${v.help}\n${v.nodes
                  .map((node) => `  ${node.target.join(" ")} — ${node.failureSummary ?? ""}`)
                  .join("\n")}`,
            )
            .join("\n"),
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
    const mobileMenu = page.getByRole("button", { name: /القائمة/ });
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
    const reloadedMobileMenu = page.getByRole("button", { name: /القائمة/ });
    if (await reloadedMobileMenu.isVisible()) await reloadedMobileMenu.click();
    await expect(page.locator(".prefs:visible .prefs__btn").first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  });

  test("mobile menu traps focus, closes on Escape, and restores body scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "افتح القائمة" });
    await toggle.click();
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();
    await expect(menu.locator('a[href], button:not([disabled])').first()).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    const focusable = menu.locator('a[href], button:not([disabled])');
    const first = focusable.first();
    const last = focusable.last();
    await last.focus();
    await page.keyboard.press("Tab");
    await expect(first).toBeFocused();
    await first.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(last).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("client validation identifies and focuses invalid create and join fields", async ({
    page,
  }) => {
    await page.goto("/create");
    await page.getByRole("button", { name: "أنشئ الغرفة" }).click();
    const createName = page.locator("#name");
    await expect(createName).toBeFocused();
    await expect(createName).toHaveAttribute("aria-invalid", "true");
    await expect(createName).toHaveAttribute("aria-describedby", /create-error/);

    await page.goto("/join");
    await page.getByRole("button", { name: "ادخل الغرفة" }).click();
    const roomCode = page.locator("#code");
    await expect(roomCode).toBeFocused();
    await expect(roomCode).toHaveAttribute("aria-invalid", "true");
    await expect(roomCode).toHaveAttribute("aria-describedby", /join-error/);
  });

  test("ticker and revision comparison remain keyboard operable", async ({ page }) => {
    await page.goto("/");
    const tickerControl = page.locator(".ticker__control");
    await tickerControl.focus();
    await tickerControl.press("Enter");
    await expect(tickerControl).toHaveAttribute("aria-pressed", "true");
    await expect(tickerControl).toHaveText("شغّل الشريط");
    await expect(page.locator(".ticker__track")).toHaveCSS("animation-play-state", "paused");

    const range = page.getByLabel("قارن النسخة الأصلية بالنسخة المعدلة");
    await range.focus();
    await range.press("Home");
    await expect(range).toHaveAttribute("aria-valuetext", "قبل التعديل");
    await range.press("End");
    await expect(range).toHaveAttribute("aria-valuetext", "بعد التعديل");
  });
});
