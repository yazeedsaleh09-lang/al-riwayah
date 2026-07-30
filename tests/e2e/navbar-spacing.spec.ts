import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

type Box = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
};

type NavbarGeometry = {
  actionButtonGaps: number[];
  actionGroupGap: number;
  brandGap: number;
  brandIsRight: boolean;
  groupOverlap: boolean;
  height: number;
  itemFitFailures: string[];
  linkGaps: number[];
  linksCenterDelta: number;
  navbarItemsInViewport: boolean;
  scrollOverflow: number;
};

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;
const OUTPUT_DIR = path.resolve("artifacts", "navbar-spacing-release");

async function measureNavbar(page: Page): Promise<NavbarGeometry> {
  return page.evaluate(() => {
    const stableBox = (rect: DOMRect): Box => ({
      bottom: rect.bottom,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      width: rect.width,
      x: rect.x,
    });

    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing navbar element: ${selector}`);
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
        x: rect.x,
      };
    };

    const nav = box(".approved-home-source .site-nav__row");
    const brand = box(".approved-home-source .site-nav .wordmark");
    const links = box(".approved-home-source .site-nav__links");
    const actions = box(".approved-home-source .site-nav__actions");
    const linkBoxes = Array.from(
      document.querySelectorAll<HTMLElement>(".approved-home-source .site-nav__links a"),
    )
      .map((element) => stableBox(element.getBoundingClientRect()))
      .sort((a, b) => a.left - b.left);
    const actionBoxes = Array.from(
      document.querySelectorAll<HTMLElement>(".approved-home-source .site-nav__actions a"),
    )
      .map((element) => stableBox(element.getBoundingClientRect()))
      .sort((a, b) => a.left - b.left);
    const navbarItems = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".approved-home-source .site-nav .wordmark, .approved-home-source .site-nav__links a, .approved-home-source .site-nav__actions a",
      ),
    );
    const navbarTextItems = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".approved-home-source .wordmark__name, .approved-home-source .site-nav__links a, .approved-home-source .site-nav__actions a",
      ),
    );

    const gaps = (boxes: Box[]) =>
      boxes.slice(1).map((current, index) => current.left - boxes[index]!.right);
    const groups = [brand, links, actions].sort((a, b) => a.left - b.left);

    return {
      actionButtonGaps: gaps(actionBoxes),
      actionGroupGap: links.left - actions.right,
      brandGap: brand.left - links.right,
      brandIsRight: brand.left > links.right,
      groupOverlap: groups.some((current, index) => {
        const next = groups[index + 1];
        return next ? current.right > next.left : false;
      }),
      height: nav.height,
      itemFitFailures: navbarTextItems.flatMap((element) => {
        const elementRect = element.getBoundingClientRect();
        const textRange = document.createRange();
        textRange.selectNodeContents(element);
        const textRect = textRange.getBoundingClientRect();
        const fits =
          element.getClientRects().length === 1 &&
          textRect.width <= elementRect.width + 1 &&
          getComputedStyle(element).whiteSpace === "nowrap";
        return fits ? [] : [element.textContent?.trim() ?? element.tagName];
      }),
      linkGaps: gaps(linkBoxes),
      linksCenterDelta: Math.abs(links.left + links.width / 2 - window.innerWidth / 2),
      navbarItemsInViewport: navbarItems.every((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left >= nav.left && rect.right <= nav.right;
      }),
      scrollOverflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
}

test.describe("desktop homepage navbar spacing", () => {
  for (const viewport of VIEWPORTS) {
    test(`keeps balanced navbar breathing room at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      const geometry = await measureNavbar(page);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      const stableGeometry = await measureNavbar(page);

      expect(geometry.height).toBe(78);
      expect(geometry.brandIsRight).toBe(true);
      expect(geometry.groupOverlap).toBe(false);
      expect(geometry.itemFitFailures).toEqual([]);
      expect(geometry.navbarItemsInViewport).toBe(true);
      expect(geometry.scrollOverflow).toBeLessThanOrEqual(0);
      expect(geometry.linksCenterDelta).toBeLessThanOrEqual(1);
      expect(geometry.brandGap).toBeGreaterThanOrEqual(22);
      expect(geometry.actionGroupGap).toBeGreaterThanOrEqual(22);
      expect(Math.abs(geometry.brandGap - geometry.actionGroupGap)).toBeLessThanOrEqual(1);
      expect(geometry.linkGaps).toHaveLength(2);
      expect(geometry.linkGaps.every((gap) => gap >= 43 && gap <= 45)).toBe(true);
      expect(geometry.actionButtonGaps).toEqual([10]);
      expect(stableGeometry).toEqual(geometry);

      await mkdir(OUTPUT_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `homepage-${viewport.width}x${viewport.height}.png`),
        fullPage: false,
      });
    });
  }
});
