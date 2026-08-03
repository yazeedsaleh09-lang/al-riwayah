import { test, expect } from "@playwright/test";

const ROUTES = [
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

test.describe("marketing site", () => {
  for (const path of ROUTES) {
    test(`route ${path} renders with a heading and no horizontal overflow`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();

      // No horizontal overflow at the current viewport width.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      // RTL document direction.
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      expect(errors).toEqual([]);
    });
  }

  test("home exposes the primary create/join actions", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "ابدأ جلسة" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "ادخل برمز" }).first()).toBeVisible();
  });

  test("public product presents Bank Al-Saha as the single 10–15 minute flagship case", async ({
    page,
  }) => {
    await page.goto("/cases");
    await expect(page.getByRole("heading", { name: "قضية بنك الساحة" })).toBeVisible();
    await expect(page.getByText("10–15 دقيقة")).toBeVisible();
    await expect(page.getByText("قضية المستودع")).toHaveCount(0);

    await page.goto("/");
    await expect(page.getByText("١٠–١٥ دقيقة").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "قضية بنك الساحة", exact: true })).toBeVisible();
  });

  test("unknown route shows the 404 page", async ({ page }) => {
    const res = await page.goto("/definitely-not-a-real-route");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("الصفحة اختفت")).toBeVisible();
  });

});
