import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("artifacts", "golden-master-pass");
const INTERROGATION_PHASES = new Set([
  "INTERROGATION_FOUNDATION",
  "INTERROGATION_GAPS",
  "INTERROGATION_NO_GOOD_ANSWER",
  "INTERROGATION_FOLLOWUP",
  "FINAL_QUESTION",
]);

async function joinLobby(page: Page, route: string, field: "#name" | "#pname", name: string) {
  await page.goto(route);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.locator(field).fill(name);
}

async function waitForPhase(page: Page, phase: string) {
  await expect(page.locator(`.game[data-phase="${phase}"]`)).toBeVisible({ timeout: 30_000 });
}

async function waitForPhaseChange(page: Page, phase: string) {
  await page.waitForFunction(
    (current) => document.querySelector<HTMLElement>(".game")?.dataset.phase !== current,
    phase,
    { timeout: 30_000 },
  );
}

async function clickFirstAvailable(page: Page) {
  const phase = await page.locator(".game").getAttribute("data-phase");
  if (phase && INTERROGATION_PHASES.has(phase)) {
    const option = page.locator(".option-btn:not([disabled])").first();
    if (!(await option.isVisible().catch(() => false))) return;
    await option.click();
    const confirm = page.locator(".gm-question__confirm");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    return;
  }
  const button = page.locator(".game__body button:not([disabled])").first();
  if (await button.isVisible().catch(() => false)) await button.click();
}

test.describe("Golden Master fidelity surfaces", () => {
  test("desktop homepage matches the approved evidence-scene composition", async ({ page }) => {
    await mkdir(OUTPUT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    const approvedHome = page.locator(".approved-home-source");
    await expect(approvedHome).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "اتفقوا على رواية.ولا تختلفون.",
    );
    await expect(page.locator("#main").getByRole("link", { name: "ابدأ جلسة" })).toHaveAttribute(
      "href",
      "/create",
    );
    await expect(page.locator("#main").getByRole("link", { name: "ادخل برمز" })).toHaveAttribute(
      "href",
      "/join",
    );
    await expect(page.locator(".approved-home-source .threads")).toHaveCSS(
      "pointer-events",
      "none",
    );

    const sourceContract = await page.evaluate(() => {
      const select = (selector: string) => {
        const node = document.querySelector<HTMLElement>(selector);
        if (!node) throw new Error(`Missing approved source node: ${selector}`);
        return { node, style: getComputedStyle(node), rect: node.getBoundingClientRect() };
      };
      const root = select(".approved-home-source");
      const nav = select(".approved-home-source .nav");
      const hero = select(".approved-home-source #main");
      const scene = select(".approved-home-source .scene-wrap");
      const shared = select(".approved-home-source .shared");
      const one = select(".approved-home-source .one");
      const two = select(".approved-home-source .two");
      const sticky = select(".approved-home-source .sticky");
      const photo = select(".approved-home-source .photo");

      return {
        root: {
          background: root.style.backgroundColor,
          minHeight: root.style.minHeight,
        },
        nav: {
          height: nav.rect.height,
          paddingInline: [nav.style.paddingLeft, nav.style.paddingRight],
          columns: nav.style.gridTemplateColumns,
        },
        hero: {
          minHeight: hero.style.minHeight,
          padding: [
            hero.style.paddingTop,
            hero.style.paddingRight,
            hero.style.paddingBottom,
            hero.style.paddingLeft,
          ],
        },
        scene: {
          width: scene.rect.width,
          height: scene.rect.height,
          minHeight: scene.style.minHeight,
        },
        evidence: {
          sharedWidth: shared.style.width,
          oneWidth: one.style.width,
          twoWidth: two.style.width,
          stickyWidth: sticky.style.width,
          photo: [photo.style.width, photo.style.height],
        },
        animations: [
          nav.style.animationName,
          select(".approved-home-source .reveal").style.animationName,
          select(".approved-home-source .layer").style.animationName,
          select(".approved-home-source .threads path").style.animationName,
        ],
      };
    });

    expect(sourceContract.root).toEqual({
      background: "rgb(238, 227, 209)",
      minHeight: "900px",
    });
    expect({
      height: sourceContract.nav.height,
      paddingInline: sourceContract.nav.paddingInline,
    }).toEqual({
      height: 78,
      paddingInline: ["64.8px", "64.8px"],
    });
    const navColumns = sourceContract.nav.columns.split(" ").map(Number.parseFloat);
    expect(navColumns).toHaveLength(3);
    expect(Math.abs(navColumns[0]! - navColumns[2]!)).toBeLessThan(0.05);
    expect(sourceContract.hero).toEqual({
      minHeight: "822px",
      padding: ["34px", "64.8px", "42px", "64.8px"],
    });
    expect(sourceContract.scene.height).toBe(670);
    expect(sourceContract.scene.minHeight).toBe("0px");
    expect(sourceContract.evidence).toEqual({
      sharedWidth: "339px",
      oneWidth: "288px",
      twoWidth: "300px",
      stickyWidth: "160px",
      photo: ["215px", "198px"],
    });
    expect(sourceContract.animations).toEqual(["none", "none", "none", "none"]);

    const stacking = await page.evaluate(() => {
      const threads = document.querySelector(".approved-home-source .threads");
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".approved-home-source .layer-sticky, .approved-home-source .layer-photo, .approved-home-source .layer-shared, .approved-home-source .layer-one, .approved-home-source .layer-two",
        ),
      );
      if (!threads || cards.length !== 5) return null;
      return {
        threads: Number(getComputedStyle(threads).zIndex),
        cards: cards.map((card) => Number(getComputedStyle(card).zIndex)),
      };
    });
    expect(stacking).not.toBeNull();
    expect(stacking!.cards.every((zIndex) => stacking!.threads < zIndex)).toBe(true);
    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
        })
        .slice(0, 8)
        .map((node) => ({
          className: node.className,
          left: Math.round(node.getBoundingClientRect().left),
          right: Math.round(node.getBoundingClientRect().right),
        })),
    }));
    expect(overflow.scrollWidth, JSON.stringify(overflow)).toBe(overflow.clientWidth);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, "home-implementation-1440x900.png"),
      animations: "disabled",
    });
  });

  test("mobile lobby matches the approved five-player composition", async ({ browser }) => {
    await mkdir(OUTPUT_DIR, { recursive: true });
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const names = ["يزيد", "سعود", "نواف", "فهد", "محمد"];

    try {
      for (const _name of names) {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          locale: "ar",
          reducedMotion: "reduce",
        });
        contexts.push(context);
        pages.push(await context.newPage());
      }

      const host = pages[0]!;
      await joinLobby(host, "/create", "#name", names[0]!);
      await host.getByRole("button", { name: "أنشئ الغرفة" }).click();
      await expect(host).toHaveURL(/\/room\/[A-Z0-9]{4,6}$/);
      const code = host.url().split("/room/")[1]!;

      for (let index = 1; index < pages.length; index++) {
        const page = pages[index]!;
        await joinLobby(page, `/join?code=${code}`, "#pname", names[index]!);
        await page.getByRole("button", { name: "ادخل الغرفة" }).click();
        await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
      }

      await expect(host.locator(".roster li")).toHaveCount(5);
      for (const index of [0, 1, 3, 4]) {
        await pages[index]!.getByRole("button", { name: "جاهز", exact: true }).click();
      }
      await expect(host.locator(".gm-lobby")).toBeVisible();
      await expect(host.locator(".gm-room-card")).toContainText(code);
      await expect(host.locator(".roster li")).toHaveCount(5);
      await expect(host.locator(".gm-player-badge--waiting")).toHaveCount(1);
      await expect(host.locator(".gm-player-badge--ready")).toHaveCount(4);
      await expect(host.locator(".gm-lobby")).toHaveCSS("background-color", "rgb(251, 248, 242)");
      await host.evaluate(() => window.scrollTo(0, 0));

      await host.screenshot({
        path: path.join(OUTPUT_DIR, "lobby-390x844.png"),
        animations: "disabled",
      });
    } finally {
      await Promise.allSettled(contexts.map((context) => context.close()));
    }
  });

  test("mobile question matches the approved selected-answer composition", async ({ browser }) => {
    test.setTimeout(180_000);
    await mkdir(OUTPUT_DIR, { recursive: true });
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const names = ["يزيد", "سعود", "نواف", "فهد"];

    try {
      for (const _name of names) {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          locale: "ar",
          reducedMotion: "reduce",
        });
        contexts.push(context);
        pages.push(await context.newPage());
      }

      const host = pages[0]!;
      await joinLobby(host, "/create", "#name", names[0]!);
      await host.getByRole("button", { name: "أنشئ الغرفة" }).click();
      await expect(host).toHaveURL(/\/room\/[A-Z0-9]{4,6}$/);
      const code = host.url().split("/room/")[1]!;
      for (let index = 1; index < pages.length; index++) {
        const page = pages[index]!;
        await joinLobby(page, `/join?code=${code}`, "#pname", names[index]!);
        await page.getByRole("button", { name: "ادخل الغرفة" }).click();
        await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
      }
      await expect(host.locator(".roster li")).toHaveCount(4);
      await Promise.all(
        pages.map((page) => page.getByRole("button", { name: "جاهز", exact: true }).click()),
      );
      await host.getByRole("button", { name: "ابدأ التحقيق" }).click();

      for (let guard = 0; guard < 15; guard++) {
        const phase = await host.locator(".game").getAttribute("data-phase");
        if (phase === "INTERROGATION_FOUNDATION") break;
        if (!phase) continue;

        if (["CASE_BRIEF", "PRIVATE_EVIDENCE", "PLAN_REVIEW"].includes(phase)) {
          await Promise.all(pages.map(clickFirstAvailable));
        } else if (phase === "PLAN_REASON") {
          await Promise.all(pages.slice(0, 3).map(clickFirstAvailable));
        } else if (phase === "PLAN_LOCATIONS") {
          await Promise.all(
            pages.map(async (page) => {
              await page.locator(".game__body button:not([disabled])").last().click();
            }),
          );
        } else if (phase === "PLAN_ROLES") {
          const rows = host.locator(".game__body .roster");
          for (let index = 0; index < (await rows.count()); index++) {
            if (!(await host.locator('.game[data-phase="PLAN_ROLES"]').count())) break;
            await rows.nth(index).locator("button").first().click();
          }
        }
        await waitForPhaseChange(host, phase);
      }

      await waitForPhase(host, "INTERROGATION_FOUNDATION");
      let capturePage = host;
      for (const page of pages) {
        if ((await page.locator(".option-btn").count()) === 4) {
          capturePage = page;
          break;
        }
      }
      const optionCount = await capturePage.locator(".option-btn:not([disabled])").count();
      await capturePage
        .locator(".option-btn:not([disabled])")
        .nth(Math.min(1, optionCount - 1))
        .click();
      await expect(capturePage.locator(".gm-question")).toBeVisible();
      await expect(capturePage.locator(".gm-private-info")).toBeVisible();
      await expect(capturePage.locator(".option-btn.is-selected")).toHaveCount(1);
      await expect(capturePage.locator(".gm-question__confirm")).toBeVisible();
      await expect(capturePage.locator(".deadline-ring")).toHaveCSS("border-radius", "999px");
      await capturePage.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.scrollTo(0, 0);
      });
      await expect.poll(() => capturePage.evaluate(() => window.scrollY)).toBe(0);

      await capturePage.screenshot({
        path: path.join(OUTPUT_DIR, "question-390x844.png"),
        animations: "disabled",
      });
    } finally {
      await Promise.allSettled(contexts.map((context) => context.close()));
    }
  });

  test("mobile result matches the approved verdict composition", async ({ browser }) => {
    test.setTimeout(240_000);
    await mkdir(OUTPUT_DIR, { recursive: true });
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const names = ["يزيد", "سعود", "نواف", "فهد"];

    try {
      for (const _name of names) {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          locale: "ar",
          reducedMotion: "reduce",
        });
        contexts.push(context);
        pages.push(await context.newPage());
      }

      const host = pages[0]!;
      await joinLobby(host, "/create", "#name", names[0]!);
      await host.getByRole("button", { name: "أنشئ الغرفة" }).click();
      await expect(host).toHaveURL(/\/room\/[A-Z0-9]{4,6}$/);
      const code = host.url().split("/room/")[1]!;
      for (let index = 1; index < pages.length; index++) {
        const page = pages[index]!;
        await joinLobby(page, `/join?code=${code}`, "#pname", names[index]!);
        await page.getByRole("button", { name: "ادخل الغرفة" }).click();
        await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
      }
      await expect(host.locator(".roster li")).toHaveCount(4);
      await Promise.all(
        pages.map((page) => page.getByRole("button", { name: "جاهز", exact: true }).click()),
      );
      await host.getByRole("button", { name: "ابدأ التحقيق" }).click();

      for (let guard = 0; guard < 55; guard++) {
        const phase = await host.locator(".game").getAttribute("data-phase");
        if (phase === "RESULTS") break;
        if (!phase) continue;

        if (
          ["CASE_BRIEF", "PRIVATE_EVIDENCE", "PLAN_REVIEW", "SURPRISE_EVIDENCE"].includes(phase)
        ) {
          await Promise.all(pages.map(clickFirstAvailable));
        } else if (phase === "PLAN_REASON") {
          await Promise.all(pages.slice(0, 3).map(clickFirstAvailable));
        } else if (phase === "PLAN_LOCATIONS") {
          await Promise.all(
            pages.map(async (page) => {
              await page.locator(".game__body button:not([disabled])").last().click();
            }),
          );
        } else if (phase === "PLAN_ROLES") {
          const rows = host.locator(".game__body .roster");
          for (let index = 0; index < (await rows.count()); index++) {
            if (!(await host.locator('.game[data-phase="PLAN_ROLES"]').count())) break;
            await rows.nth(index).locator("button").first().click();
          }
        } else if (INTERROGATION_PHASES.has(phase)) {
          await Promise.all(pages.map(clickFirstAvailable));
        } else if (phase === "PATCH_1" || phase === "PATCH_2") {
          await Promise.all(pages.map(clickFirstAvailable));
        }

        await waitForPhaseChange(host, phase);
      }

      await waitForPhase(host, "RESULTS");
      await expect(host.locator(".gm-result")).toBeVisible();
      await expect(host.locator(".gm-verdict-panel")).toHaveCSS(
        "background-color",
        "rgb(25, 24, 21)",
      );
      await expect(host.locator(".gm-metric-card")).toHaveCount(3);
      await expect(host.getByText("أسوأ تناقض", { exact: true })).toBeVisible();
      await expect(host.getByText("أفضل ترقيعة", { exact: true })).toBeVisible();
      await expect(host.locator(".gm-result")).not.toContainText("الشرخ");
      await host.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.scrollTo(0, 0);
      });
      await expect.poll(() => host.evaluate(() => window.scrollY)).toBe(0);

      await host.screenshot({
        path: path.join(OUTPUT_DIR, "result-390x844.png"),
        animations: "disabled",
      });
    } finally {
      await Promise.allSettled(contexts.map((context) => context.close()));
    }
  });
});
