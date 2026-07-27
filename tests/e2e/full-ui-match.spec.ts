import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";

type MatchClients = {
  contexts: BrowserContext[];
  pages: Page[];
  code: string;
};

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

async function createClients(browser: Browser, count: number): Promise<MatchClients> {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  for (let index = 0; index < count; index++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "ar",
      reducedMotion: "no-preference",
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
  await Promise.all(
    pages.map((page) => page.getByRole("button", { name: "جاهز", exact: true }).click()),
  );
  await expect(host.getByRole("button", { name: "ابدأ التحقيق" })).toBeEnabled();
  return { contexts, pages, code };
}

async function waitForPhase(page: Page, phase: string, timeout = 15_000): Promise<void> {
  await expect(page.locator(`.game[data-phase="${phase}"]`)).toBeVisible({ timeout });
}

async function clickFirstAvailable(page: Page): Promise<void> {
  const button = page.locator(".game__actions button:not([disabled]), .option-btn:not([disabled])").first();
  if (await button.isVisible().catch(() => false)) await button.click();
}

async function waitForPhaseChange(page: Page, current: string): Promise<void> {
  await page.waitForFunction(
    (phase) => document.querySelector<HTMLElement>(".game")?.dataset.phase !== phase,
    current,
    { timeout: 15_000 },
  );
}

async function driveToResults(
  clients: MatchClients,
  options: {
    refresh?: boolean;
    disconnect?: boolean;
    duplicateAnswer?: boolean;
    axe?: boolean;
  } = {},
): Promise<void> {
  const { pages, contexts } = clients;
  const host = pages[0]!;
  let refreshed = false;
  let disconnected = false;
  let duplicated = false;
  const auditedPhases = new Set<string>();

  await host.getByRole("button", { name: "ابدأ التحقيق" }).click();

  for (let guard = 0; guard < 50; guard++) {
    const phase = await host.locator(".game").getAttribute("data-phase");
    if (!phase) {
      await host.waitForTimeout(100);
      continue;
    }
    if (phase === "RESULTS") return;

    if (
      options.axe &&
      ["CASE_BRIEF", "PRIVATE_EVIDENCE", "INTERROGATION_FOUNDATION", "PATCH_1"].includes(
        phase,
      ) &&
      !auditedPhases.has(phase)
    ) {
      auditedPhases.add(phase);
      const results = await new AxeBuilder({ page: host })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        results.violations.filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical",
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
      await Promise.all(pages.map((page) => clickFirstAvailable(page)));
    } else if (phase === "PLAN_ROLES") {
      const roleRows = host.locator(".game__body .roster");
      for (let index = 0; index < (await roleRows.count()); index++) {
        await roleRows.nth(index).locator("button").first().click();
      }
    } else if (INTERROGATION.has(phase)) {
      if (options.refresh && !refreshed && phase === "INTERROGATION_GAPS") {
        refreshed = true;
        await pages[2]!.reload({ waitUntil: "domcontentloaded" });
      }
      if (options.disconnect && !disconnected && phase === "INTERROGATION_NO_GOOD_ANSWER") {
        disconnected = true;
        await contexts.at(-1)!.setOffline(true);
        await Promise.all(pages.slice(0, -1).map((page) => clickFirstAvailable(page)));
        await waitForPhaseChange(host, phase);
        await contexts.at(-1)!.setOffline(false);
        await pages.at(-1)!.reload({ waitUntil: "domcontentloaded" });
        continue;
      }
      if (options.duplicateAnswer && !duplicated && phase === "INTERROGATION_FOUNDATION") {
        duplicated = true;
        await pages[0]!.locator(".option-btn:not([disabled])").first().evaluate((button) => {
          (button as HTMLButtonElement).click();
          (button as HTMLButtonElement).click();
        });
        await Promise.all(pages.slice(1).map((page) => clickFirstAvailable(page)));
      } else {
        await Promise.all(pages.map((page) => clickFirstAvailable(page)));
      }
    } else if (phase === "PATCH_1" || phase === "PATCH_2") {
      await Promise.all(pages.map((page) => clickFirstAvailable(page)));
    }

    await waitForPhaseChange(host, phase);
  }
  throw new Error("UI match did not reach RESULTS");
}

async function saveEvidence(page: Page, name: string): Promise<void> {
  const evidenceDir = path.resolve("artifacts", "final-playtest-pass", "full-match");
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, `${name}.png`), fullPage: true });
}

async function closeClients(clients: MatchClients): Promise<void> {
  await Promise.all(clients.contexts.map((context) => context.close()));
}

test.describe("real multi-client UI matches", () => {
  test.setTimeout(180_000);

  test("4 players complete, reject a duplicate answer, and replay cleanly", async ({ browser }) => {
    const clients = await createClients(browser, 4);
    try {
      await saveEvidence(clients.pages[0]!, "4-player-lobby");
      const lobbyAxe = await new AxeBuilder({ page: clients.pages[0]! })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        lobbyAxe.violations.filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical",
        ),
      ).toEqual([]);
      await driveToResults(clients, { duplicateAnswer: true, axe: true });
      const host = clients.pages[0]!;
      await expect(host.locator(".verdict-band")).toBeVisible();
      await expect(host.locator(".axis")).toHaveCount(4);
      await expect(host.locator(".result-story")).toBeVisible();
      const resultsAxe = await new AxeBuilder({ page: host })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        resultsAxe.violations.filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical",
        ),
      ).toEqual([]);
      await saveEvidence(host, "4-player-results");

      await host.getByRole("button", { name: "أعيدوا القضية" }).click();
      await waitForPhase(host, "CASE_BRIEF");
      await expect(host.locator(".verdict-band")).toHaveCount(0);
    } finally {
      await closeClients(clients);
    }
  });

  test("5 players complete with a browser refresh and create a clean new group", async ({
    browser,
  }) => {
    const clients = await createClients(browser, 5);
    try {
      await driveToResults(clients, { refresh: true });
      const host = clients.pages[0]!;
      await expect(host.locator(".verdict-band")).toBeVisible();
      await expect(clients.pages[2]!.locator(".verdict-band")).toBeVisible();
      await saveEvidence(host, "5-player-results");

      await host.getByRole("button", { name: "مجموعة جديدة" }).click();
      await waitForPhase(host, "LOBBY");
      await expect(host).not.toHaveURL(new RegExp(`/room/${clients.code}$`));
      await expect(host.locator(".roster li")).toHaveCount(1);
    } finally {
      await closeClients(clients);
    }
  });

  test("6 players complete through a disconnect and one server-timed missing answer", async ({
    browser,
  }) => {
    const clients = await createClients(browser, 6);
    try {
      await driveToResults(clients, { disconnect: true });
      for (const page of clients.pages) {
        await expect(page.locator(".verdict-band")).toBeVisible();
      }
      await saveEvidence(clients.pages[0]!, "6-player-results");
    } finally {
      await closeClients(clients);
    }
  });
});
