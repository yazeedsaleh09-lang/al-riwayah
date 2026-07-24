import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_ROUTES = ["/", "/how-to-play", "/cases", "/play", "/create", "/privacy", "/terms"];

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
});
