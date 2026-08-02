import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";

type MatchClients = {
  contexts: BrowserContext[];
  pages: Page[];
  code: string;
};

const GAME_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const PHASES_WITH_ACK = new Set([
  "CASE_BRIEF",
  "PRIVATE_EVIDENCE",
  "PLAN_REVIEW",
  "SURPRISE_EVIDENCE",
]);
const INTERROGATION = new Set([
  "INTERROGATION_FOUNDATION",
  "INTERROGATION_GAPS",
  "INTERROGATION_NO_GOOD_ANSWER",
  "INTERROGATION_FOLLOWUP",
  "FINAL_QUESTION",
]);
const RELEASE_EVIDENCE_DIR = process.env.SIMPLE_RELEASE_GATE === "1"
  ? path.resolve("artifacts", "simple-release-gate", "screenshots")
  : path.resolve("artifacts", "final-playtest-pass", "full-match");

async function createClients(browser: Browser, count: number): Promise<MatchClients> {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  if (count === 4) {
    await mkdir(path.resolve("artifacts", "final-playtest-pass", "motion"), {
      recursive: true,
    });
  }
  for (let index = 0; index < count; index++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "ar",
      reducedMotion: "no-preference",
      ...(count === 4 && index === 0
        ? {
            recordVideo: {
              dir: path.resolve("artifacts", "final-playtest-pass", "motion"),
              size: { width: 390, height: 844 },
            },
          }
        : {}),
    });
    contexts.push(context);
    pages.push(await context.newPage());
  }

  const host = pages[0]!;
  await host.goto("/create");
  await expect(host.locator("html")).toHaveAttribute("data-hydrated", "true");
  await host.locator("#name").fill("لاعب ١");
  await host.getByRole("button", { name: "أنشئ الغرفة" }).click();
  await expect(host).toHaveURL(/\/room\/[A-Z0-9]{4,6}$/);
  const code = host.url().split("/room/")[1]!;

  for (let index = 1; index < count; index++) {
    const page = pages[index]!;
    await page.goto(`/join?code=${code}`);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await page.locator("#pname").fill(`لاعب ${index + 1}`);
    await page.getByRole("button", { name: "ادخل الغرفة" }).click();
    await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
  }

  await expect(host.locator(".roster li")).toHaveCount(count);
  for (const page of pages) {
    await page.getByRole("button", { name: "جاهز", exact: true }).click({ force: true });
    await expect(page.getByRole("button", { name: "ألغِ الجاهزية", exact: true })).toBeVisible();
  }
  await expect(host.getByRole("button", { name: "ابدأ التحقيق" })).toBeEnabled();
  return { contexts, pages, code };
}

async function waitForPhase(page: Page, phase: string, timeout = 15_000): Promise<void> {
  await expect(page.locator(`.game[data-phase="${phase}"]`)).toBeVisible({ timeout });
}

async function clickFirstAvailable(page: Page): Promise<void> {
  const phase = await page.locator(".game").getAttribute("data-phase");
  if (phase && INTERROGATION.has(phase)) {
    const option = page.locator(".option-btn:not([disabled])").first();
    if (!(await option.isVisible().catch(() => false))) return;
    await option.click();
    const confirm = page.locator(".gm-question__confirm");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    return;
  }
  const button = page
    .locator(".game__actions button:not([disabled]), .option-btn:not([disabled])")
    .first();
  if (!(await button.isVisible().catch(() => false))) return;
  try {
    await button.click({ timeout: 5_000 });
  } catch (error) {
    const next = await page.locator(".game").getAttribute("data-phase");
    if (phase && next && next !== phase) return;
    if (!(await button.isVisible().catch(() => false))) return;
    throw error;
  }
}

async function clickLastAvailable(page: Page): Promise<void> {
  const button = page.locator(".game__body button:not([disabled])").last();
  if ((await button.count()) > 0) await button.click();
}

async function waitForPhaseChange(page: Page, current: string): Promise<void> {
  await page.waitForFunction(
    (phase) => {
      const next = document.querySelector<HTMLElement>(".game")?.dataset.phase;
      return Boolean(next && next !== phase);
    },
    current,
    { timeout: 60_000 },
  );
}

async function driveToResults(
  clients: MatchClients,
  options: {
    refresh?: boolean;
    disconnect?: boolean;
    duplicateAnswer?: boolean;
    axe?: boolean;
    evidence?: boolean;
  } = {},
): Promise<void> {
  const { pages, contexts } = clients;
  const host = pages[0]!;
  let refreshed = false;
  let disconnected = false;
  let duplicated = false;
  const auditedPhases = new Set<string>();
  const capturedPhases = new Set<string>();

  await host.getByRole("button", { name: "ابدأ التحقيق" }).click();

  for (let guard = 0; guard < 50; guard++) {
    const phase = await host.locator(".game").getAttribute("data-phase");
    if (!phase) {
      await host.waitForTimeout(100);
      continue;
    }
    if (phase === "RESULT_REVEAL") return;

    if (phase === "STORY_BUILDING") {
      await host.getByRole("button", { name: "اعتمدوا الرواية للمراجعة" }).click({ force: true });
    } else if (phase === "STORY_REVIEW") {
      for (const page of pages) {
        await page.getByRole("button", { name: "فهمت الرواية" }).click({ force: true });
        await page.waitForTimeout(150);
      }
    } else if (phase === "SILENT_PHASE_INTRO") {
      for (const page of pages) {
        await page.getByRole("button", { name: "ابدأ سؤالي" }).click({ force: true });
        await page.waitForTimeout(150);
      }
    } else if (phase === "CHAPTER_CONTEXT") {
      await host.getByRole("button", { name: "ابدأوا الأسئلة بصمت" }).click({ force: true });
    } else if (phase === "SILENT_ANSWERING" || phase === "WAITING_FOR_ANSWERS") {
      if (options.refresh && !refreshed) {
        refreshed = true;
        await pages[2]!.reload({ waitUntil: "domcontentloaded" });
      }
      if (options.disconnect && !disconnected) {
        disconnected = true;
        const disconnectedPage = pages.at(-1)!;
        await contexts.at(-1)!.setOffline(true);
        await expect(disconnectedPage.locator(".reconnect-overlay")).toBeVisible();
        await saveEvidence(disconnectedPage, `${pages.length}-player-reconnect`);
        await contexts.at(-1)!.setOffline(false);
        await expect(disconnectedPage.locator(".reconnect-overlay")).toHaveCount(0);
      }
      for (const [index, page] of pages.entries()) {
        if (!(await page.getByRole("button", { name: "ثبّت الإجابة" }).isVisible().catch(() => false))) {
          continue;
        }
        await page.locator('[role="radio"]:not([disabled])').first().click({ force: true });
        const confirm = page.getByRole("button", { name: "ثبّت الإجابة" });
        if (options.duplicateAnswer && !duplicated && index === 0) {
          duplicated = true;
          await confirm.evaluate((button) => {
            (button as HTMLButtonElement).click();
            (button as HTMLButtonElement).click();
          });
        } else {
          await confirm.click({ force: true });
        }
        await page.waitForTimeout(150);
      }
    } else if (phase === "ISSUE_REVEAL") {
      await host.getByRole("button", { name: "افتحوا النقاش" }).click({ force: true });
    } else if (phase === "OPEN_DISCUSSION") {
      for (const page of pages) {
        await page.getByRole("button", { name: "خلصت نقاش" }).click({ force: true });
        await page.waitForTimeout(150);
      }
    } else if (phase === "PATCH_BALLOT") {
      for (const page of pages) {
        await page.getByRole("button", { name: "ثبّت الترتيب" }).click({ force: true });
        await page.waitForTimeout(150);
      }
    } else if (phase === "PATCH_RESOLUTION") {
      await host.getByRole("button", { name: "شوفوا تحديث الرواية" }).click({ force: true });
    } else if (phase === "STORY_UPDATE") {
      for (const page of pages) {
        await page.getByRole("button", { name: "فهمت التعديل" }).click({ force: true });
        await page.waitForTimeout(150);
      }
    } else if (phase === "RESULT_CALCULATION") {
      await host.getByRole("button", { name: "اعرض النتيجة" }).click({ force: true });
    } else

    if (options.evidence && !capturedPhases.has(phase)) {
      if (phase === "INTERROGATION_FOUNDATION") {
        capturedPhases.add(phase);
        await saveEvidence(host, "4-player-question");
        await captureResponsivePhase(host, "4-player-question");
      } else if (phase === "CONTRADICTION_REVEAL_1") {
        capturedPhases.add(phase);
        await expect(host.locator(".demo__statements .statement")).toHaveCount(2);
        await expect(host.locator(".demo__rule")).toBeVisible();
        await saveEvidence(host, "4-player-contradiction");
      } else if (phase === "PATCH_1") {
        capturedPhases.add(phase);
        await expect(host.locator(".game__actions .option-btn")).not.toHaveCount(0);
        await saveEvidence(host, "4-player-patch");
      }
    }

    if (
      options.axe &&
      ["CASE_BRIEF", "PRIVATE_EVIDENCE", "INTERROGATION_FOUNDATION", "PATCH_1"].includes(phase) &&
      !auditedPhases.has(phase)
    ) {
      auditedPhases.add(phase);
      const results = await new AxeBuilder({ page: host })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        results.violations.filter(
          (violation) => violation.impact === "serious" || violation.impact === "critical",
        ),
        `axe violations during ${phase}`,
      ).toEqual([]);
    }

    if (PHASES_WITH_ACK.has(phase)) {
      await Promise.all(pages.map((page) => clickFirstAvailable(page)));
    } else if (phase === "PLAN_REASON") {
      const majority = Math.floor(pages.length / 2) + 1;
      await Promise.all(pages.slice(0, majority).map((page) => clickFirstAvailable(page)));
    } else if (phase === "PLAN_LOCATIONS") {
      // Lock a location that differs from the first authored interrogation
      // answer. This deterministically exercises the real contradiction and
      // patch surfaces without touching engine authority.
      await Promise.all(pages.map((page) => clickLastAvailable(page)));
    } else if (phase === "PLAN_ROLES") {
      const roleRows = host.locator(".game__body .roster");
      for (let index = 0; index < (await roleRows.count()); index++) {
        if ((await host.locator('.game[data-phase="PLAN_ROLES"]').count()) === 0) break;
        try {
          await roleRows.nth(index).locator("button").first().click({ timeout: 5_000 });
        } catch (error) {
          if ((await host.locator('.game[data-phase="PLAN_ROLES"]').count()) === 0) break;
          throw error;
        }
      }
    } else if (INTERROGATION.has(phase)) {
      if (options.refresh && !refreshed && phase === "INTERROGATION_GAPS") {
        refreshed = true;
        await pages[2]!.reload({ waitUntil: "domcontentloaded" });
      }
      if (options.disconnect && !disconnected && phase === "INTERROGATION_NO_GOOD_ANSWER") {
        disconnected = true;
        const disconnectedPage = pages.at(-1)!;
        await contexts.at(-1)!.setOffline(true);
        await expect(disconnectedPage.locator(".reconnect-overlay")).toBeVisible();
        await saveEvidence(disconnectedPage, `${pages.length}-player-reconnect`);
        await Promise.all(pages.slice(0, -1).map((page) => clickFirstAvailable(page)));
        await waitForPhaseChange(host, phase);
        await contexts.at(-1)!.setOffline(false);
        await pages.at(-1)!.reload({ waitUntil: "domcontentloaded" });
        continue;
      }
      if (options.duplicateAnswer && !duplicated && phase === "INTERROGATION_FOUNDATION") {
        duplicated = true;
        const option = pages[0]!.locator(".option-btn:not([disabled])").first();
        const confirm = pages[0]!.locator(".gm-question__confirm");
        await expect(confirm).toBeDisabled();
        await option.click();
        await expect(option).toBeFocused();
        await expect(option).toHaveAttribute("aria-checked", "true");
        await expect(host.locator(".option-btn.is-selected")).toHaveCount(1);
        await expect(confirm).toBeEnabled();
        await expect(pages[0]!.locator(".answer-receipt")).toHaveCount(0);
        if (options.evidence) await saveEvidence(host, "4-player-selection");

        const fixedActionMetrics = await pages[0]!.evaluate(() => {
          const action = document.querySelector<HTMLElement>(".gm-question__confirm");
          const lastOption = Array.from(document.querySelectorAll<HTMLElement>(".option-btn")).at(
            -1,
          );
          if (!action || !lastOption) return null;
          const actionRect = action.getBoundingClientRect();
          const optionRect = lastOption.getBoundingClientRect();
          return {
            position: getComputedStyle(action).position,
            actionHeight: actionRect.height,
            actionTop: actionRect.top,
            optionBottom: optionRect.bottom,
          };
        });
        expect(fixedActionMetrics).not.toBeNull();
        expect(fixedActionMetrics!.position).toBe("fixed");
        expect(fixedActionMetrics!.actionHeight).toBeGreaterThanOrEqual(44);
        expect(
          fixedActionMetrics!.optionBottom,
          "the fixed confirmation CTA must not cover the final option",
        ).toBeLessThanOrEqual(fixedActionMetrics!.actionTop);

        if (process.env.SIMPLE_RELEASE_GATE === "1") {
          await confirm.click();
        } else {
          await confirm.evaluate((button) => {
            (button as HTMLButtonElement).click();
            (button as HTMLButtonElement).click();
          });
        }
        await expect(pages[0]!.locator(".answer-receipt")).toHaveCount(1);
        if (options.evidence) {
          await expect(host.locator('.game[data-phase="INTERROGATION_FOUNDATION"]')).toBeVisible();
          await expect(host.locator(".answer-receipt")).toHaveAttribute("aria-live", "polite");
          await saveEvidence(host, "4-player-answer-locked");
          await saveEvidence(host, "4-player-waiting");
        }
        await Promise.all(pages.slice(1).map((page) => clickFirstAvailable(page)));
      } else {
        await Promise.all(pages.map((page) => clickFirstAvailable(page)));
      }
    } else if (phase === "PATCH_1" || phase === "PATCH_2") {
      if (options.evidence && phase === "PATCH_1") {
        await clickFirstAvailable(host);
        await expect(host.locator(".patch-choice-receipt")).toBeVisible();
        await saveEvidence(host, "4-player-patch-selection");
        await Promise.all(pages.slice(1).map((page) => clickFirstAvailable(page)));
      } else {
        await Promise.all(pages.map((page) => clickFirstAvailable(page)));
      }
    }

    await waitForPhaseChange(host, phase);
  }
  throw new Error("UI match did not reach RESULT_REVEAL");
}

async function saveEvidence(page: Page, name: string): Promise<void> {
  await mkdir(RELEASE_EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(RELEASE_EVIDENCE_DIR, `${name}.png`),
    animations: "disabled",
    caret: "initial",
  });
}

async function saveBodyEvidence(page: Page, name: string): Promise<void> {
  const evidenceDir = path.resolve("artifacts", "final-playtest-pass", "full-match");
  await mkdir(evidenceDir, { recursive: true });
  await page.locator(".game").evaluate((node) => node.classList.add("is-evidence-capture"));
  await page.locator(".game__body").screenshot({
    path: path.join(evidenceDir, `${name}.png`),
    animations: "disabled",
    caret: "initial",
  });
  await page.locator(".game").evaluate((node) => node.classList.remove("is-evidence-capture"));
}

async function captureResponsivePhase(page: Page, name: string): Promise<void> {
  const evidenceDir = path.resolve("artifacts", "final-playtest-pass", "responsive-game");
  await mkdir(evidenceDir, { recursive: true });
  for (const viewport of GAME_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        ),
      )
      .toBe(true);
    await expect(page.locator(".game__body")).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, `${name}-${viewport.width}x${viewport.height}.png`),
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

async function closeClients(clients: MatchClients): Promise<void> {
  await Promise.allSettled(clients.contexts.map((context) => context.close()));
}

test.describe("real multi-client UI matches", () => {
  test.setTimeout(600_000);

  test("4 players complete, reject a duplicate answer, and replay cleanly", async ({ browser }) => {
    const clients = await createClients(browser, 4);
    const hostVideo = clients.pages[0]!.video();
    try {
      await saveEvidence(clients.pages[0]!, "4-player-lobby");
      await captureResponsivePhase(clients.pages[0]!, "4-player-lobby");
      const lobbyAxe = await new AxeBuilder({ page: clients.pages[0]! })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        lobbyAxe.violations.filter(
          (violation) => violation.impact === "serious" || violation.impact === "critical",
        ),
      ).toEqual([]);
      await driveToResults(clients, {
        duplicateAnswer: true,
        disconnect: true,
        axe: true,
        evidence: true,
      });
      const host = clients.pages[0]!;
      await expect(host.locator(".verdict-band")).toBeVisible();
      await expect(host.locator(".gm-metric-card")).toHaveCount(3);
      await expect(host.locator(".gm-metric-card").first()).toBeVisible();
      await expect(host.locator(".result-story")).toBeVisible();
      await expect(host.locator(".result-story")).not.toContainText("{{");
      const resultsAxe = await new AxeBuilder({ page: host })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        resultsAxe.violations.filter(
          (violation) => violation.impact === "serious" || violation.impact === "critical",
        ),
      ).toEqual([]);
      await saveEvidence(host, "4-player-results");
      await saveBodyEvidence(host, "4-player-results-full");

      await host.getByRole("button", { name: "أعيدوا القضية" }).click();
      await waitForPhase(host, "STORY_BUILDING");
      await expect(host.locator(".verdict-band")).toHaveCount(0);
    } finally {
      await closeClients(clients);
      await hostVideo?.saveAs(
        path.resolve("artifacts", "final-playtest-pass", "motion", "gameplay-4-player.webm"),
      );
    }
  });

  test("5 players complete with a browser refresh and create a clean new group", async ({
    browser,
  }) => {
    const clients = await createClients(browser, 5);
    try {
      await saveEvidence(clients.pages[0]!, "5-player-lobby");
      await driveToResults(clients, { refresh: true });
      const host = clients.pages[0]!;
      await expect(host.locator(".verdict-band")).toBeVisible();
      await expect(clients.pages[2]!.locator(".verdict-band")).toBeVisible();
      await saveEvidence(host, "5-player-results");
      await saveBodyEvidence(host, "5-player-results-full");

      await host.getByRole("button", { name: "مجموعة جديدة" }).click();
      await waitForPhase(host, "LOBBY");
      await expect(host).not.toHaveURL(new RegExp(`/room/${clients.code}$`));
      await expect(host.locator(".roster li")).toHaveCount(1);
    } finally {
      await closeClients(clients);
    }
  });

  test("6 players complete through a disconnect and restored private answer", async ({
    browser,
  }) => {
    const clients = await createClients(browser, 6);
    try {
      await saveEvidence(clients.pages[0]!, "6-player-lobby");
      await driveToResults(clients, { disconnect: true });
      for (const page of clients.pages) {
        await expect(page.locator(".verdict-band")).toBeVisible();
      }
      await saveEvidence(clients.pages[0]!, "6-player-results");
      await saveBodyEvidence(clients.pages[0]!, "6-player-results-full");
    } finally {
      await closeClients(clients);
    }
  });
});
