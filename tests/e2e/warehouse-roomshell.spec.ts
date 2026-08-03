import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

test.skip(true, "Retired Warehouse public flow; server compatibility remains covered by integration tests");

type AnswerMode = "consistent" | "conflict";
const SCREENSHOT_DIR = path.resolve("artifacts/warehouse-case-v1/screenshots");
const PHASE_BANNERS: Readonly<Record<string, { title: string; tone: string }>> = {
  STORY_BUILDING: { title: "تكلموا الآن", tone: "talk" },
  STORY_REVIEW: { title: "راجعوا الرواية معًا", tone: "talk" },
  SILENT_PHASE_INTRO: { title: "من هنا يبدأ الصمت", tone: "silence" },
  CHAPTER_CONTEXT: { title: "اقرأوا الدليل بصمت", tone: "silence" },
  SILENT_ANSWERING: { title: "إجابة سرية — ممنوع النقاش", tone: "silence" },
  WAITING_FOR_ANSWERS: { title: "استمروا في الصمت", tone: "waiting" },
  ISSUE_REVEAL: { title: "الحين تكلموا", tone: "talk" },
  OPEN_DISCUSSION: { title: "ناقشوا الحل", tone: "talk" },
  PATCH_BALLOT: { title: "اختيار سري — لا تقول ترتيبك", tone: "ballot" },
  PATCH_RESOLUTION: { title: "القرار الجماعي", tone: "talk" },
  STORY_UPDATE: { title: "راجعوا التعديل معًا", tone: "talk" },
  RESULT_CALCULATION: { title: "نحسب النتيجة", tone: "waiting" },
  RESULT_REVEAL: { title: "النتيجة — تكلموا", tone: "talk" },
};

async function capture(page: Page, name: string, allowTransitionOverlay = false) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  if (!allowTransitionOverlay) {
    await page.waitForTimeout(100);
    await page
      .getByTestId("warehouse-phase-interstitial")
      .waitFor({ state: "detached", timeout: 3_000 });
  }
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, name),
    animations: "disabled",
    fullPage: true,
  });
}

async function gotoWithNetworkRetry(page: Page, route: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(route);
      return;
    } catch (error) {
      if (!String(error).includes("ERR_NETWORK_CHANGED") || attempt === 2) throw error;
      await page.waitForTimeout(250);
    }
  }
}

async function createWarehousePages(browser: Browser, count: 4 | 5 | 6) {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  const runtimeErrors: string[] = [];
  const names = ["يزيد", "سعود", "نواف", "فهد", "محمد", "راكان"].slice(0, count);
  for (const _name of names) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "ar",
      reducedMotion: "reduce",
    });
    contexts.push(context);
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    pages.push(page);
  }

  const host = pages[0]!;
  await gotoWithNetworkRetry(host, "/create");
  await expect(host.locator("html")).toHaveAttribute("data-hydrated", "true");
  await host.locator("#name").fill(names[0]!);
  await host.getByRole("button", { name: "أنشئ الغرفة" }).click();
  await expect(host).toHaveURL(/\/room\/[A-Z0-9]{4,6}$/);
  const code = host.url().split("/room/")[1]!;

  for (let index = 1; index < pages.length; index++) {
    const page = pages[index]!;
    await gotoWithNetworkRetry(page, `/join?code=${code}`);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await page.locator("#pname").fill(names[index]!);
    await page.getByRole("button", { name: "ادخل الغرفة" }).click();
    await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
  }

  await expect(host.locator(".roster li")).toHaveCount(count);
  for (const page of pages) {
    await page.getByRole("button", { name: "جاهز", exact: true }).click({ force: true });
    await expect(page.getByRole("button", { name: "ألغِ الجاهزية", exact: true })).toBeVisible();
  }
  await host.getByRole("button", { name: "ابدأ التحقيق" }).click();
  await waitForPhase(host, "STORY_BUILDING");
  return { contexts, pages, host, runtimeErrors };
}

async function waitForPhase(page: Page, phase: string) {
  await expect(page.locator(`.game[data-phase="${phase}"]`)).toBeVisible({ timeout: 30_000 });
  const expected = PHASE_BANNERS[phase];
  if (expected) {
    const banner = page.getByTestId("warehouse-phase-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("data-tone", expected.tone);
    await expect(banner).toContainText(expected.title);
    await expect(banner).toContainText(/الكلام|الصمت|سري|انتظار/);
  }
}

async function waitUntilNotPhase(page: Page, phase: string) {
  await page.waitForFunction(
    (current) => document.querySelector<HTMLElement>(".game")?.dataset.phase !== current,
    phase,
    { timeout: 30_000 },
  );
}

async function clickButton(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click({ force: true });
}

async function clickSequentially(pages: Page[], action: (page: Page) => Promise<unknown>) {
  for (const page of pages) {
    await action(page);
    await page.waitForTimeout(250);
  }
}

async function answerAll(
  pages: Page[],
  mode: AnswerMode,
  seenPrompts?: Set<string>,
  waitingScreenshot?: string,
) {
  for (const [index, page] of pages.entries()) {
    await clickSequentially([page], async (currentPage) => {
      const prompt = await currentPage.locator(".game__prompt").textContent();
      expect(prompt?.trim().length).toBeGreaterThan(0);
      seenPrompts?.add(prompt!.trim());

      const options = currentPage.locator('[role="radio"]:not([disabled])');
      await expect(options.first()).toBeVisible();
      const optionIndex = mode === "conflict" ? index % Math.min(await options.count(), 2) : 0;
      const option = options.nth(optionIndex);
      await option.focus();
      await currentPage.keyboard.press("ArrowDown");
      await expect(currentPage.locator('[role="radio"][aria-checked="true"]')).toHaveCount(1);
      if (mode === "consistent") await options.first().click();
      await currentPage.getByRole("button", { name: "ثبّت الإجابة" }).click();
    });
    if (index === 0 && waitingScreenshot) await capture(page, waitingScreenshot);
  }
}

async function submitBallots(pages: Page[], reconnectPage?: Page) {
  if (reconnectPage) {
    await expect(reconnectPage.getByTestId("warehouse-ranked-ballot")).toBeVisible();
    const down = reconnectPage.getByRole("button", { name: "للأسفل" }).first();
    if (await down.isEnabled().catch(() => false)) await down.click();
    await reconnectPage.context().setOffline(true);
    await expect(pages[0]!.locator(".warehouse-disconnect")).toBeVisible();
    await capture(pages[0]!, "90-disconnected-skip-state.png");
    await reconnectPage.context().setOffline(false);
    await expect(reconnectPage.locator(".reconnect-overlay")).toHaveCount(0, { timeout: 30_000 });
    await expect(reconnectPage.getByTestId("warehouse-ranked-ballot")).toBeVisible();
    await capture(reconnectPage, "91-reconnect-restored.png");
    await reconnectPage.getByRole("button", { name: "ثبّت الترتيب" }).click();
    await reconnectPage.context().setOffline(true);
    await reconnectPage.context().setOffline(false);
    await expect(reconnectPage.getByText("سلّموا الترتيب")).toBeVisible();
  }

  await clickSequentially(
    pages.filter((page) => page !== reconnectPage),
    async (page) => {
      await expect(page.getByTestId("warehouse-ranked-ballot")).toBeVisible();
      await page.getByRole("button", { name: "ثبّت الترتيب" }).click();
    },
  );
}

async function startQuestions(host: Page, pages: Page[]) {
  await waitForPhase(host, "SILENT_PHASE_INTRO");
  for (const [index, page] of pages.entries()) {
    await clickButton(page, "ابدأ سؤالي");
    await expect(page.locator(".action-error")).toHaveCount(0);
    if (index === pages.length - 1) {
      await waitForPhase(host, "CHAPTER_CONTEXT");
    } else {
      await expect(host.locator(".warehouse-progress")).toHaveText(
        `بدأوا أسئلتهم: ${index + 1} من ${pages.length}`,
      );
    }
  }
}

async function completeStorySetup(host: Page, pages: Page[], captureEvidence = false) {
  await expect(host.getByTestId("warehouse-story-builder")).toBeVisible();
  if (captureEvidence) await capture(host, "01-story-builder.png");
  await expect(host.getByText("أماكن اللاعبين عند 23:46")).toBeVisible();
  await expect(host.locator(".game")).not.toContainText("الأدوار");
  await clickButton(host, "اعتمدوا الرواية للمراجعة");

  await waitForPhase(host, "STORY_REVIEW");
  if (captureEvidence) await capture(host, "02-story-review.png");
  await expect(host.getByTestId("warehouse-story-review")).toContainText("المفتاح كان مع");
  await clickSequentially(pages, (page) => clickButton(page, "فهمت الرواية"));

  await waitForPhase(host, "SILENT_PHASE_INTRO");
  if (captureEvidence) await capture(host, "03-silent-intro.png", true);
  await expect(host.getByTestId("warehouse-silent-intro")).toContainText("لا تناقشوا الأسئلة");
  await expect(host.getByTestId("warehouse-phase-interstitial")).toContainText(
    "الآن كل واحد يجاوب لحاله — بدون كلام",
  );
  await expect(host.getByTestId("warehouse-phase-banner")).toHaveAttribute(
    "aria-live",
    "assertive",
  );
  await startQuestions(host, pages);
}

async function completeChapter({
  host,
  pages,
  answerMode,
  seenPrompts,
  reconnectDuringBallot,
  capturePrefix,
}: {
  host: Page;
  pages: Page[];
  answerMode: AnswerMode;
  seenPrompts?: Set<string>;
  reconnectDuringBallot?: boolean;
  capturePrefix?: string;
}) {
  await waitForPhase(host, "CHAPTER_CONTEXT");
  if (capturePrefix) await capture(host, `${capturePrefix}-evidence.png`);
  await expect(host.getByTestId("warehouse-evidence")).toBeVisible();
  await clickButton(host, "ابدأوا الأسئلة بصمت");

  await waitForPhase(host, "SILENT_ANSWERING");
  await expect(host.locator(".gm-question")).toBeVisible();
  const hostPrompt = await pages[0]!.locator(".game__prompt").textContent();
  const otherPrompt = await pages[1]!.locator(".game__prompt").textContent();
  if (otherPrompt && otherPrompt !== hostPrompt) {
    await expect(pages[0]!.locator(".game")).not.toContainText(otherPrompt);
  }
  await answerAll(
    pages,
    answerMode,
    seenPrompts,
    capturePrefix ? `${capturePrefix}-waiting.png` : undefined,
  );

  await waitForPhase(host, "ISSUE_REVEAL");
  await expect(host.getByTestId("warehouse-phase-interstitial")).toContainText(
    "الآن تقدرون تتكلمون",
  );
  if (capturePrefix) await capture(host, `${capturePrefix}-issue.png`);
  await expect(
    host.locator(".warehouse-issue-list, [data-testid='warehouse-no-direct-issue']"),
  ).toBeVisible();
  await expect(host.locator(".game")).not.toContainText("مهمة");
  await expect(host.locator(".game")).not.toContainText("أسوأ لاعب");
  await clickButton(host, "افتحوا النقاش");

  await waitForPhase(host, "OPEN_DISCUSSION");
  await expect(host.getByText("جاهزون للتصويت")).toBeVisible();
  await clickSequentially(pages, (page) => clickButton(page, "خلصت نقاش"));
  await waitUntilNotPhase(host, "OPEN_DISCUSSION");

  const afterDiscussion = await host.locator(".game").getAttribute("data-phase");
  if (afterDiscussion === "PATCH_BALLOT") {
    await expect(host.getByTestId("warehouse-ranked-ballot")).toBeVisible();
    const firstPatchName = (
      await host.getByTestId("warehouse-ranked-ballot").locator("strong").first().textContent()
    )?.trim();
    expect(firstPatchName).toBeTruthy();
    await expect(host.getByRole("button", { name: `حرّك ${firstPatchName} للأسفل` })).toBeVisible();
    if (capturePrefix) await capture(host, `${capturePrefix}-ranked-ballot.png`);
    await submitBallots(pages, reconnectDuringBallot ? pages[1] : undefined);
    await waitForPhase(host, "PATCH_RESOLUTION");
    if (capturePrefix) await capture(host, `${capturePrefix}-patch-resolution.png`);
    await expect(host.getByTestId("warehouse-story-update")).toBeVisible();
    await expect(host.getByTestId("warehouse-story-update")).not.toContainText(
      /gate_|device_|car_|movement\./,
    );
    await clickButton(host, "شوفوا تحديث الرواية");
    await waitForPhase(host, "STORY_UPDATE");
    await expect(host.getByTestId("warehouse-story-update")).toBeVisible();
    if (capturePrefix) await capture(host, `${capturePrefix}-story-update.png`);
  } else {
    await waitForPhase(host, "STORY_UPDATE");
  }
}

async function playToResult(options: {
  browser: Browser;
  playerCount: 4 | 5 | 6;
  answerMode: AnswerMode;
  reconnectDuringBallot?: boolean;
  seenPrompts?: Set<string>;
  captureEvidence?: boolean;
}) {
  const { contexts, pages, host, runtimeErrors } = await createWarehousePages(
    options.browser,
    options.playerCount,
  );
  await completeStorySetup(host, pages, options.captureEvidence);
  for (let chapter = 0; chapter < 3; chapter++) {
    await completeChapter({
      host,
      pages,
      answerMode: options.answerMode,
      seenPrompts: options.seenPrompts,
      reconnectDuringBallot: options.reconnectDuringBallot && chapter === 0,
      capturePrefix: options.captureEvidence ? `chapter-${chapter + 1}` : undefined,
    });
    await clickSequentially(pages, (page) => clickButton(page, "فهمت التعديل"));
    if (chapter < 2) await startQuestions(host, pages);
  }
  await waitForPhase(host, "RESULT_CALCULATION");
  await clickButton(host, "اعرض النتيجة");
  await waitForPhase(host, "RESULT_REVEAL");
  return { contexts, pages, host, runtimeErrors };
}

async function closeAll(contexts: BrowserContext[]) {
  await Promise.allSettled(contexts.map((context) => context.close()));
}

test.describe("Warehouse RoomShell active matrix", () => {
  test("test-only evidence renders all issue types and fail-closed score state", async ({
    page,
  }) => {
    await page.goto("/e2e/warehouse-evidence");
    await expect(page.locator("[data-issue-type]")).toHaveCount(4);
    await expect(page.getByTestId("warehouse-fair-score-failure")).toBeVisible();
    await capture(page, "00-all-issue-types-test-only.png");
    await page.getByTestId("warehouse-fair-score-failure").screenshot({
      path: path.join(SCREENSHOT_DIR, "00-fair-score-failure-test-only.png"),
      animations: "disabled",
    });
  });

  test("4 players complete active flow with grouped result and no private leak", async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    const { contexts, host, runtimeErrors } = await playToResult({
      browser,
      playerCount: 4,
      answerMode: "conflict",
      captureEvidence: true,
    });
    try {
      await expect(host.locator(".gm-result")).toBeVisible();
      await expect(host.locator(".gm-metric-card")).toHaveCount(3);
      await expect(host.locator(".gm-result")).not.toContainText("أقوى شاهد");
      await expect(host.locator(".gm-result")).not.toContainText("أكثر شخص ضرّ");
      await expect(host.locator(".gm-result")).toContainText("أسوأ تناقض");

      await capture(host, "99-result.png");

      await host.setViewportSize({ width: 320, height: 568 });
      const overflow = await host.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(overflow.scrollWidth).toBe(overflow.clientWidth);

      expect(runtimeErrors).toEqual([]);
      await host.getByRole("button", { name: "أعيدوا القضية" }).click();
      await waitForPhase(host, "STORY_BUILDING");
      await expect(host.locator(".gm-result")).toHaveCount(0);
    } finally {
      await closeAll(contexts);
    }
  });

  test("host transfer gives story approval to the next connected player", async ({ browser }) => {
    test.setTimeout(90_000);
    const { contexts, pages, host } = await createWarehousePages(browser, 4);
    try {
      const nextHost = pages[1]!;
      const approval = nextHost.getByRole("button", { name: "اعتمدوا الرواية للمراجعة" });
      await expect(approval).toBeDisabled();
      await host.context().setOffline(true);
      await expect(approval).toBeEnabled({ timeout: 30_000 });
      await approval.click();
      await waitForPhase(nextHost, "STORY_REVIEW");
      await host.context().setOffline(false);
      await waitForPhase(host, "STORY_REVIEW");
    } finally {
      await closeAll(contexts);
    }
  });

  test("5 players restore an own ballot after disconnect during PATCH_BALLOT", async ({
    browser,
  }) => {
    test.setTimeout(260_000);
    const { contexts, host } = await playToResult({
      browser,
      playerCount: 5,
      answerMode: "conflict",
      reconnectDuringBallot: true,
    });
    try {
      await expect(host.locator(".gm-result")).toBeVisible();
      await expect(host.locator(".gm-result")).not.toContainText("أقوى شاهد");
      await expect(host.locator(".gm-result")).not.toContainText("أكثر شخص ضرّ");
    } finally {
      await closeAll(contexts);
    }
  });

  test("6 players all receive real questions without role or mission copy", async ({ browser }) => {
    test.setTimeout(280_000);
    const seenPrompts = new Set<string>();
    const { contexts, host } = await playToResult({
      browser,
      playerCount: 6,
      answerMode: "consistent",
      seenPrompts,
    });
    try {
      expect(seenPrompts.size).toBeGreaterThanOrEqual(6);
      await expect(host.locator(".game")).not.toContainText("دور");
      await expect(host.locator(".game")).not.toContainText("مهمة");
      await expect(host.locator(".gm-result")).toBeVisible();
    } finally {
      await closeAll(contexts);
    }
  });

  test("consistent 5-player path avoids direct-contradiction cards and tells group result", async ({
    browser,
  }) => {
    test.setTimeout(260_000);
    const { contexts, host } = await playToResult({
      browser,
      playerCount: 5,
      answerMode: "consistent",
    });
    try {
      await expect(host.getByTestId("warehouse-no-direct-result")).toBeVisible();
      await capture(host, "98-consistent-result.png");
      await expect(host.locator(".gm-result")).not.toContainText("أسوأ تناقض");
      await expect(host.locator(".gm-result")).not.toContainText("أقوى شاهد");
      await expect(host.locator(".gm-result")).not.toContainText("أكثر شخص ضرّ");
    } finally {
      await closeAll(contexts);
    }
  });
});
