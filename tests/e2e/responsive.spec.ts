import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROUTES = ["/", "/how-to-play", "/cases", "/join", "/play", "/create", "/privacy", "/terms"];
const VIEWPORTS = [
  { name: "320x568", width: 320, height: 568 },
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
] as const;

test("responsive route matrix has no overflow, console errors, or clipped primary controls", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const stage = process.env.EVIDENCE_STAGE ?? "after";
  const evidenceDir = path.resolve("artifacts", "final-playtest-pass", stage);
  await mkdir(evidenceDir, { recursive: true });

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    for (const route of ROUTES) {
      consoleErrors.length = 0;
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1").first()).toBeVisible();

      const metrics = await page.evaluate(() => ({
        documentOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      }));
      expect(metrics.documentOverflow, `${route} at ${viewport.name}`).toBeLessThanOrEqual(1);
      expect(metrics.bodyOverflow, `${route} at ${viewport.name}`).toBeLessThanOrEqual(1);
      expect(consoleErrors, `${route} at ${viewport.name}`).toEqual([]);

      const smallControls = await page
        .locator("button, .btn, .option-btn")
        .evaluateAll((controls) =>
          controls
            .filter((control) => {
              const rect = control.getBoundingClientRect();
              const style = getComputedStyle(control);
              if (control.getAttribute("aria-label") === "Open Next.js Dev Tools") return false;
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                rect.width > 0 &&
                rect.height > 0 &&
                (rect.width < 44 || rect.height < 44)
              );
            })
            .map((control) => ({
              text: control.getAttribute("aria-label") ?? control.textContent?.trim().slice(0, 40),
              width: Math.round(control.getBoundingClientRect().width),
              height: Math.round(control.getBoundingClientRect().height),
            })),
        );
      expect(smallControls, `${route} at ${viewport.name}`).toEqual([]);

      if (viewport.name === "390x844" || viewport.name === "1440x900") {
        const routeName = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
        const needsStaticJourney =
          viewport.width >= 900 && (route === "/" || route === "/how-to-play");
        if (needsStaticJourney) await page.emulateMedia({ reducedMotion: "reduce" });
        try {
          await page.screenshot({
            path: path.join(evidenceDir, `${routeName}-${viewport.name}.png`),
            fullPage: true,
            caret: "initial",
          });
        } finally {
          if (needsStaticJourney) await page.emulateMedia({ reducedMotion: "no-preference" });
        }
      }
    }
  }
});
