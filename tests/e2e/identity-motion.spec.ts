import { expect, test } from "@playwright/test";

test.describe("final identity and motion system", () => {
  test("uses the light editorial palette and non-circular Versioned Testimony hero", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const identity = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      const spans = Array.from(document.querySelectorAll<HTMLElement>(".hero__title span"));
      return {
        voidColor: root.getPropertyValue("--void").trim(),
        statementColor: root.getPropertyValue("--statement").trim(),
        verdictColor: root.getPropertyValue("--verdict").trim(),
        bodyFont: body.fontFamily,
        hasEditor: Boolean(document.querySelector(".testimony-editor")),
        hasRejectedTable: Boolean(document.querySelector(".alibi-table")),
        circularBrandMarks: document.querySelectorAll(".wordmark__mark circle").length,
        lines: spans.map((span) => {
          const rect = span.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            viewport: document.documentElement.clientWidth,
            whiteSpace: getComputedStyle(span).whiteSpace,
          };
        }),
      };
    });

    expect(identity.voidColor).toBe("#f3ecdf");
    expect(identity.statementColor).toBe("#1a1915");
    expect(identity.verdictColor).toBe("#a43f38");
    expect(identity.bodyFont).toContain("IBM Plex Sans Arabic");
    expect(identity.hasEditor).toBe(true);
    expect(identity.hasRejectedTable).toBe(false);
    expect(identity.circularBrandMarks).toBe(0);
    expect(identity.lines).toHaveLength(2);
    for (const line of identity.lines) {
      expect(line.whiteSpace).toBe("nowrap");
      expect(line.left).toBeGreaterThanOrEqual(-1);
      expect(line.right).toBeLessThanOrEqual(line.viewport + 1);
    }
  });

  test("gallery rail advances from one scroll progress source", async ({ page }) => {
    await page.goto("/");
    const viewport = page.viewportSize();
    if (!viewport || viewport.width < 900) {
      await expect(page.locator(".gallery-rail__mobile-preview:visible")).toHaveCount(6);
      return;
    }

    const rail = page.locator(".gallery-rail");
    const scrollTarget = await rail.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      const travel = Math.max(1, element.clientHeight - window.innerHeight);
      return top + travel * 0.98;
    });
    await page.evaluate((top) => window.scrollTo(0, top), scrollTarget);
    await expect(page.locator(".gallery-rail__index li[data-active='true'] strong")).toHaveText(
      "واجهوا التقرير",
    );
  });

  test("reduced motion exposes ordered static content", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".gallery-rail__mobile-preview:visible")).toHaveCount(6);
    await expect(page.locator(".ticker__duplicate")).toBeHidden();
    await expect(page.locator(".testimony-editor del")).toBeVisible();
    await expect(page.locator(".testimony-editor ins")).toBeVisible();
    await expect(page.getByLabel("قارن النسخة الأصلية بالنسخة المعدلة")).toBeVisible();
    await expect(page.locator(".testimony-editor")).toHaveCSS("animation-name", "none");
  });

  test("revision scrubber responds directly to pointer and keyboard input", async ({ page }) => {
    await page.goto("/");
    const editor = page.locator(".testimony-editor");
    const scrubber = page.locator(".testimony-editor__scrubber");
    const range = page.getByLabel("قارن النسخة الأصلية بالنسخة المعدلة");
    await scrubber.scrollIntoViewIfNeeded();
    const box = await scrubber.boundingBox();
    expect(box).not.toBeNull();

    await scrubber.hover({ position: { x: box!.width * 0.2, y: box!.height / 2 } });
    await expect.poll(() => editor.evaluate((node) => node.style.getPropertyValue("--revision-ratio")))
      .toBe("0.8");

    await range.focus();
    await range.press("Home");
    await expect(range).toHaveAttribute("aria-valuetext", "قبل التعديل");
    await range.press("End");
    await expect(range).toHaveAttribute("aria-valuetext", "بعد التعديل");
  });

  test("contradiction surface responds to pointer and explicit reveal", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const surface = page.locator(".reveal-surface");
    await surface.scrollIntoViewIfNeeded();
    const box = await surface.boundingBox();
    expect(box).not.toBeNull();
    await surface.hover({
      position: {
        x: box!.width * 0.72,
        y: box!.height * 0.45,
      },
    });
    await expect
      .poll(() => surface.getAttribute("style"))
      .toContain("--reveal-x");
    await page.getByRole("button", { name: "أظهر سبب التناقض" }).click();
    await expect(page.getByText(/تناقض «إنكار شاهد»/)).toBeVisible();
  });
});
