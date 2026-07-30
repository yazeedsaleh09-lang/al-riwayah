import { expect, test } from "@playwright/test";

test.describe("approved identity and motion system", () => {
  test("uses the locked paper, ink, evidence-red, and layered-board identity", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const identity = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(".approved-home-source")!;
      const title = root.querySelector<HTMLElement>("h1")!;
      const scene = root.querySelector<HTMLElement>(".scene-wrap")!;
      const mark = root.querySelector<HTMLElement>('[aria-label*="الرئيسية"] span')!;
      return {
        background: getComputedStyle(root).backgroundColor,
        ink: getComputedStyle(root).color,
        title: title.getBoundingClientRect().toJSON(),
        scene: scene.getBoundingClientRect().toJSON(),
        markRadius: getComputedStyle(mark).borderRadius,
        evidenceThreads: root.querySelectorAll(".threads path").length,
        circularBrandMarks: root.querySelectorAll('[aria-label*="الرئيسية"] circle').length,
      };
    });

    expect(identity.background).toBe("rgb(238, 227, 209)");
    expect(identity.ink).toBe("rgb(23, 22, 18)");
    expect(identity.title.left).toBeGreaterThanOrEqual(0);
    expect(identity.title.right).toBeLessThanOrEqual(1440);
    expect(identity.scene.width).toBe(714);
    expect(identity.scene.height).toBe(670);
    expect(identity.markRadius).toBe("0px");
    expect(identity.evidenceThreads).toBe(3);
    expect(identity.circularBrandMarks).toBe(0);
  });

  test("the evidence board preserves its explicit, static stacking hierarchy", async ({ page }) => {
    await page.goto("/");
    const hierarchy = await page.evaluate(() => {
      const style = (selector: string) =>
        getComputedStyle(document.querySelector<HTMLElement>(selector)!);
      return {
        threadZ: Number(style(".approved-home-source .threads").zIndex),
        sharedZ: Number(style(".approved-home-source .layer-shared").zIndex),
        firstZ: Number(style(".approved-home-source .layer-one").zIndex),
        secondZ: Number(style(".approved-home-source .layer-two").zIndex),
        pointerEvents: style(".approved-home-source .threads").pointerEvents,
        animationNames: [
          style(".approved-home-source .reveal").animationName,
          style(".approved-home-source .layer").animationName,
          style(".approved-home-source .threads path").animationName,
        ],
      };
    });

    expect(hierarchy.threadZ).toBeLessThan(hierarchy.sharedZ);
    expect(hierarchy.sharedZ).toBeLessThan(hierarchy.firstZ);
    expect(hierarchy.firstZ).toBeLessThan(hierarchy.secondZ);
    expect(hierarchy.pointerEvents).toBe("none");
    expect(hierarchy.animationNames).toEqual(["none", "none", "none"]);
  });

  test("reduced motion keeps every mobile content block available in source order", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.locator(".approved-home-source .scene-wrap")).toBeHidden();
    await expect(page.getByRole("heading", { name: "رواية واحدة تحت ضغط الأسئلة." })).toBeVisible();
    await expect(page.locator("ol li")).toHaveCount(3);
    await expect(page.getByLabel("مثال سؤال على الجوال")).toBeVisible();
    await expect(page.getByLabel("مثال نتيجة على الجوال")).toBeVisible();
    await expect(page.getByRole("heading", { name: "جاهزين تثبّتون روايتكم؟" })).toBeVisible();
  });

  test("long-page progression reaches the phone preview and available case without overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const questionPreview = page.getByLabel("مثال سؤال على الجوال");
    await questionPreview.scrollIntoViewIfNeeded();
    await expect(questionPreview).toBeVisible();
    await page.getByRole("heading", { name: "ظرف الرواتب المفقود" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("link", { name: "شوفوا ملف القضية" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
  });

  test("mobile navigation responds to keyboard input and restores focus on Escape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const toggle = page.getByRole("button", { name: "افتح القائمة" });
    await toggle.focus();
    await toggle.press("Enter");
    await expect(page.locator("#mobile-menu")).toBeVisible();
    await expect(page.locator("#mobile-menu a").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-menu")).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });
});
