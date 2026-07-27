import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

test.skip(process.env.E2E_PRODUCTION !== "1", "Performance budgets are measured on the production build.");

declare global {
  interface Window {
    __alrPerf?: {
      cls: number;
      lcp: number;
      longTasks: number[];
    };
  }
}

test("production homepage stays within the playtest performance budget", async ({ page }) => {
  await page.addInitScript(() => {
    window.__alrPerf = { cls: 0, lcp: 0, longTasks: [] };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        if (!shift.hadRecentInput) window.__alrPerf!.cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) window.__alrPerf!.lcp = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      window.__alrPerf!.longTasks.push(...list.getEntries().map((entry) => entry.duration));
    }).observe({ type: "longtask", buffered: true });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  const response = await page.request.get("/");
  expect(response.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const scriptBytes = resources
      .filter((resource) => resource.initiatorType === "script")
      .reduce((total, resource) => total + resource.transferSize, 0);
    return {
      lcpMs: Math.round(window.__alrPerf?.lcp ?? 0),
      cls: Number((window.__alrPerf?.cls ?? 0).toFixed(4)),
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadMs: Math.round(navigation.loadEventEnd),
      scriptTransferBytes: scriptBytes,
      longTaskCount: window.__alrPerf?.longTasks.length ?? 0,
      longestTaskMs: Math.round(Math.max(0, ...(window.__alrPerf?.longTasks ?? []))),
    };
  });

  const evidenceDir = path.resolve("artifacts", "final-playtest-pass");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    path.join(evidenceDir, "performance-report.json"),
    `${JSON.stringify(metrics, null, 2)}\n`,
    "utf8",
  );

  expect(metrics.lcpMs).toBeGreaterThan(0);
  expect(metrics.lcpMs).toBeLessThanOrEqual(2500);
  expect(metrics.cls).toBeLessThanOrEqual(0.1);
  expect(metrics.longestTaskMs).toBeLessThanOrEqual(200);
  expect(metrics.scriptTransferBytes).toBeLessThanOrEqual(600_000);
});
