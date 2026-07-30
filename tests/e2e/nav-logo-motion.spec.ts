import { expect, test, type Page } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/how-to-play",
  "/cases",
  "/about",
  "/create",
  "/join",
  "/play",
  "/privacy",
  "/terms",
  "/missing-route-for-nav-check",
] as const;

const NAVIGATION = [
  { href: "/how-to-play", label: "كيف تلعب" },
  { href: "/cases", label: "القضايا" },
  { href: "/about", label: "عن اللعبة" },
] as const;

const ACTIONS = [
  { href: "/create", label: "ابدأ جلسة" },
  { href: "/play", label: "عندي رمز" },
] as const;

async function expectCanonicalWordmark(page: Page) {
  const wordmark = page.locator(".site-nav .wordmark");
  await expect(wordmark).toHaveCount(1);
  await expect(wordmark.locator(".wordmark__name")).toHaveText("الرواية");
  await expect(wordmark.locator(".wordmark__mark")).toHaveText("ر");
  await expect(wordmark.locator("svg")).toHaveCount(0);
}

test.describe("canonical public identity", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} uses the shared wordmark and navigation`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route);

      await expectCanonicalWordmark(page);
      await expect(page.locator(".site-nav__links")).toHaveCount(1);
      await expect(page.locator(".site-nav__actions")).toHaveCount(1);
      await expect(page.locator(".site-nav .prefs")).toHaveCount(0);

      for (const item of NAVIGATION) {
        await expect(
          page.locator(`.site-nav__links a[href="${item.href}"]`, { hasText: item.label }),
        ).toHaveCount(1);
      }
      for (const item of ACTIONS) {
        await expect(
          page.locator(`.site-nav__actions a[href="${item.href}"]`, { hasText: item.label }),
        ).toHaveCount(1);
      }
    });
  }

  test("desktop header keeps three balanced zones", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const geometry = await page.locator(".site-nav__row").evaluate((row) => {
      const brand = row.querySelector<HTMLElement>(".wordmark")!.getBoundingClientRect();
      const links = row.querySelector<HTMLElement>(".site-nav__links")!.getBoundingClientRect();
      const actions = row.querySelector<HTMLElement>(".site-nav__actions")!.getBoundingClientRect();
      return {
        brandCenter: brand.x + brand.width / 2,
        linksCenter: links.x + links.width / 2,
        actionsCenter: actions.x + actions.width / 2,
      };
    });

    expect(geometry.brandCenter).toBeGreaterThan(geometry.linksCenter);
    expect(geometry.linksCenter).toBeGreaterThan(geometry.actionsCenter);
    expect(Math.abs(geometry.linksCenter - 720)).toBeLessThan(24);
  });
});

test.describe("canonical mobile navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/cases");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  });

  test("exposes one accessible menu with every route and action", async ({ page }) => {
    const toggle = page.getByRole("button", { name: "افتح القائمة" });
    const toggleBox = await toggle.boundingBox();
    const wordmarkBox = await page.locator(".site-nav .wordmark").boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(wordmarkBox).not.toBeNull();
    expect(toggleBox!.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
    expect(wordmarkBox!.x).toBeGreaterThan(toggleBox!.x);
    await toggle.click();

    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await expect(menu.locator("a")).toHaveCount(5);
    await expect(menu.getByRole("link", { name: "ابدأ جلسة" })).toHaveAttribute("href", "/create");
    await expect(menu.getByRole("link", { name: "عندي رمز" })).toHaveAttribute("href", "/play");
    await expect(page.locator(".site-nav .prefs")).toHaveCount(0);
  });

  test("Escape closes the menu, restores focus, and unlocks scrolling", async ({ page }) => {
    const toggle = page.getByRole("button", { name: "افتح القائمة" });
    await toggle.focus();
    await toggle.press("Enter");
    await expect(page.locator("#mobile-menu a").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });

  test("route selection closes the menu", async ({ page }) => {
    await page.getByRole("button", { name: "افتح القائمة" }).click();
    await page.locator("#mobile-menu").getByRole("link", { name: "عن اللعبة" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
  });
});

test.describe("shared motion contract", () => {
  test("central tokens drive restrained public entrances and interactions", async ({ page }) => {
    await page.goto("/how-to-play");
    const tokens = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const card = getComputedStyle(document.querySelector<HTMLElement>(".simple-card")!);
      const milliseconds = (property: string) => {
        const value = root.getPropertyValue(property).trim();
        return value.endsWith("ms")
          ? Number.parseFloat(value)
          : Number.parseFloat(value) * 1000;
      };
      return {
        immediate: milliseconds("--motion-immediate"),
        control: milliseconds("--motion-control"),
        card: milliseconds("--motion-card"),
        section: milliseconds("--motion-section"),
        reveal: milliseconds("--motion-reveal"),
        ease: root.getPropertyValue("--motion-ease-out").trim(),
        cardAnimation: card.animationName,
      };
    });

    expect(tokens).toEqual({
      immediate: 140,
      control: 180,
      card: 240,
      section: 320,
      reveal: 520,
      ease: "cubic-bezier(.23, 1, .32, 1)",
      cardAnimation: "surface-enter",
    });
  });

  test("reduced motion removes transforms and decorative drawing without hiding content", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.locator(".home-continuation")).toBeVisible();
    const reduced = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>(
        ".home-continuation .simple-section > .simple-container",
      )!;
      const thread = document.querySelector<SVGPathElement>(".approved-home-source .threads path");
      const sectionStyle = getComputedStyle(section);
      const threadStyle = thread ? getComputedStyle(thread) : null;
      return {
        sectionTransform: sectionStyle.transform,
        sectionOpacity: sectionStyle.opacity,
        sectionAnimation: sectionStyle.animationName,
        threadAnimation: threadStyle?.animationName ?? "none",
      };
    });

    expect(reduced.sectionTransform).toBe("none");
    expect(Number(reduced.sectionOpacity)).toBeGreaterThan(0);
    expect(reduced.sectionAnimation).toBe("none");
    expect(reduced.threadAnimation).toBe("none");
  });

  test("public entrance settles once without layout shift or hidden content", async ({ page }) => {
    await page.addInitScript(() => {
      const state = window as typeof window & { __layoutShiftScore?: number };
      state.__layoutShiftScore = 0;
      new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!shift.hadRecentInput) state.__layoutShiftScore! += shift.value ?? 0;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    await page.goto("/how-to-play");
    const card = page.locator(".simple-card").first();
    const initial = await card.evaluate((element) => ({
      offsetTop: (element as HTMLElement).offsetTop,
      animations: element.getAnimations().map((animation) => animation.playState),
    }));
    expect(initial.animations.length).toBeGreaterThan(0);

    await page.waitForTimeout(500);
    const settled = await card.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        offsetTop: (element as HTMLElement).offsetTop,
        opacity: style.opacity,
        transform: style.transform,
        animations: element.getAnimations().map((animation) => animation.playState),
      };
    });
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    const afterScroll = await card.evaluate((element) =>
      element.getAnimations().map((animation) => animation.playState),
    );

    expect(settled.offsetTop).toBe(initial.offsetTop);
    expect(settled.opacity).toBe("1");
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(settled.transform);
    expect(settled.animations.every((state) => state === "finished")).toBe(true);
    expect(afterScroll).toEqual(settled.animations);
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { __layoutShiftScore?: number }).__layoutShiftScore ?? 0,
      ),
    ).toBeLessThanOrEqual(0.01);
  });
});
