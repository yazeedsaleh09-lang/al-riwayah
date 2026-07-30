import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_ROUTES = [
  "/",
  "/about",
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

  test("public navigation omits gameplay-only preference controls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await expect(page.locator(".site-nav .prefs")).toHaveCount(0);
    await page.getByRole("button", { name: "افتح القائمة" }).click();
    await expect(page.locator("#mobile-menu .prefs")).toHaveCount(0);
  });

  test("mobile menu traps focus, closes on Escape, and restores body scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    });
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
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "أنشئ الغرفة" }).click();
    const createName = page.locator("#name");
    await expect(createName).toBeFocused();
    await expect(createName).toHaveAttribute("aria-invalid", "true");
    await expect(createName).toHaveAttribute("aria-describedby", /create-error/);

    await page.goto("/join");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "ادخل الغرفة" }).click();
    const roomCode = page.locator("#code");
    await expect(roomCode).toBeFocused();
    await expect(roomCode).toHaveAttribute("aria-invalid", "true");
    await expect(roomCode).toHaveAttribute("aria-describedby", /join-error/);
  });

  test("homepage primary actions remain keyboard operable", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    });
    const join = page.locator("#main").getByRole("link", { name: "ادخل برمز" });
    await join.focus();
    await expect(join).toBeFocused();
    await join.press("Enter");
    await expect(page).toHaveURL(/\/join$/);

    await page.goBack();
    const create = page.locator("#main").getByRole("link", { name: "ابدأ جلسة" });
    await create.focus();
    await expect(create).toBeFocused();
    await create.press("Enter");
    await expect(page).toHaveURL(/\/create$/);
  });
});
