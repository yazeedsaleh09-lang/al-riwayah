import { expect, test } from "@playwright/test";

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
] as const;

const FORBIDDEN_PUBLIC_COPY = ["الشرخ", "نسخة المراجعة", "review-build"] as const;

test.describe("full product completion contracts", () => {
  test("Golden Master gameplay rules are present in the loaded stylesheet graph", async ({
    page,
  }) => {
    await page.goto("/");

    const loadedCss = await page.evaluate(() => {
      const css: string[] = [];
      const visit = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          css.push(rule.cssText);
          if ("cssRules" in rule) {
            try {
              visit((rule as CSSGroupingRule).cssRules);
            } catch {
              // Cross-origin sheets are not part of the application style contract.
            }
          }
        }
      };

      for (const sheet of Array.from(document.styleSheets)) {
        try {
          visit(sheet.cssRules);
        } catch {
          // Ignore browser-managed or cross-origin stylesheets.
        }
      }
      return css.join("\n");
    });

    expect(loadedCss).toContain(".game.gm-lobby");
    expect(loadedCss).toContain(".game.gm-question");
    expect(loadedCss).toContain(".game.gm-result");
    expect(loadedCss).toMatch(/\.gm-question__confirm\s*\{[^}]*position:\s*fixed/s);
    expect(loadedCss).toMatch(/\.gm-question__confirm\s*\{[^}]*safe-area-inset-bottom/s);
  });

  test("/about is a real route and states only the grounded product facts", async ({ page }) => {
    const response = await page.goto("/about");
    expect(response?.status()).toBe(200);
    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const copy = await page.locator("main#main").innerText();
    expect(copy).toMatch(/(?:٤|4)\s*(?:–|-|إلى)\s*(?:٦|6)/);
    expect(copy).toMatch(/(?:١٣|13)\s*(?:–|-|إلى)\s*(?:١٨|18)/);
    expect(copy).toMatch(/(?:بدون|لا تحتاج|ما تحتاج)[^\n]{0,40}(?:حساب|تسجيل)/);
    expect(copy).toMatch(/(?:بدون|لا تحتاج|ما تحتاج)[^\n]{0,50}(?:تحميل|تنزيل|تطبيق)/);
    expect(copy).toMatch(/(?:بدون|لا تحتاج|ما تحتاج)[^\n]{0,50}(?:تلفزيون|شاشة)/);
    expect(copy).toMatch(/(?:الجوال|الجوالات|الهاتف|الهواتف)/);
  });

  for (const route of PUBLIC_ROUTES) {
    test(`public route ${route} contains no internal or rejected terminology`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      const visibleCopy = await page.locator("body").innerText();
      for (const forbidden of FORBIDDEN_PUBLIC_COPY) {
        expect(visibleCopy, `${route} contains ${forbidden}`).not.toContain(forbidden);
      }
    });
  }

  test("/join is canonical and /play declares /join as its compatibility canonical", async ({
    page,
  }) => {
    for (const route of ["/join", "/play"]) {
      await page.goto(route);
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical, `${route} must have exactly one canonical`).toHaveCount(1);
      const href = await canonical.evaluate((node: HTMLLinkElement) => node.href);
      expect(new URL(href).pathname, `${route} canonical`).toBe("/join");
    }
  });

  test("fresh room loading and no-session states always preserve the skip-link main target", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const state = window as typeof window & { __sawGameWithoutMain?: boolean };
      state.__sawGameWithoutMain = false;
      window.addEventListener("DOMContentLoaded", () => {
        const inspect = () => {
          const game = document.querySelector(".game");
          if (game && game.id !== "main") state.__sawGameWithoutMain = true;
        };
        new MutationObserver(inspect).observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
        inspect();
      });
    });

    await page.goto("/room/ZXCV");
    await expect(page.locator('a.skip-link[href="#main"]')).toBeVisible();
    await expect(page.locator('a[href="/join?code=ZXCV"]')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("main#main")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => (window as typeof window & { __sawGameWithoutMain?: boolean }).__sawGameWithoutMain,
      ),
    ).toBe(false);
  });

  test("mobile homepage navigation is keyboard reachable and exposes real routes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const toggle = page.locator('button[aria-controls="mobile-menu"]');
    await expect(toggle).toBeVisible();
    await toggle.focus();
    await expect(toggle).toBeFocused();

    const toggleBox = await toggle.boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(toggleBox!.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox!.height).toBeGreaterThanOrEqual(44);

    await toggle.press("Enter");
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();
    await expect(menu.locator('a[href="/how-to-play"]')).toBeVisible();
    await expect(menu.locator('a[href="/cases"]')).toBeVisible();
    await expect(menu.locator('a[href="/about"]')).toBeVisible();
    await expect(menu.locator('a[href="/create"]')).toBeVisible();

    const undersizedTargets = await menu.locator("a, button").evaluateAll((targets) =>
      targets
        .filter((target) => {
          const rect = target.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        })
        .map((target) => ({
          label: target.getAttribute("aria-label") ?? target.textContent?.trim(),
          width: Math.round(target.getBoundingClientRect().width),
          height: Math.round(target.getBoundingClientRect().height),
        })),
    );
    expect(undersizedTargets).toEqual([]);
  });
});
