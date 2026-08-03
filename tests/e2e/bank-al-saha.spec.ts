import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const NAMES = ["يزيد", "سعود", "نواف", "فهد", "محمد", "راكان"] as const;

async function waitForPhase(page: Page, phase: string) {
  await expect(page.locator(`[data-testid="bank-room"][data-phase="${phase}"]`)).toBeVisible({
    timeout: 30_000,
  });
}

async function waitForHydration(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true", { timeout: 30_000 });
}

async function createPlayers(browser: Browser, count: 4 | 5 | 6) {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  for (let index = 0; index < count; index += 1) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "ar",
      reducedMotion: "reduce",
    });
    contexts.push(context);
    pages.push(await context.newPage());
  }

  const host = pages[0]!;
  await host.goto("/create");
  await waitForHydration(host);
  await host.locator("#name").fill(NAMES[0]);
  await expect(host.locator("#name")).toHaveValue(NAMES[0]);
  await host.getByRole("button", { name: "أنشئ الغرفة" }).click();
  await expect(host).toHaveURL(/\/room\/[A-Z0-9]{4,6}$/);
  const code = host.url().split("/room/")[1]!;

  for (let index = 1; index < pages.length; index += 1) {
    const page = pages[index]!;
    await page.goto(`/join?code=${code}`);
    await waitForHydration(page);
    await expect(page.locator("#code")).toHaveValue(code);
    await page.locator("#pname").fill(NAMES[index]!);
    await expect(page.locator("#pname")).toHaveValue(NAMES[index]!);
    await page.getByRole("button", { name: "ادخل الغرفة" }).click();
    await expect(page).toHaveURL(new RegExp(`/room/${code}$`));
    await expect(page.locator(".roster")).toBeVisible();
  }
  await expect(host.locator(".roster li")).toHaveCount(count);
  for (const page of pages) await page.getByRole("button", { name: "جاهز", exact: true }).click();
  await host.getByRole("button", { name: "ابدأ التحقيق" }).click();
  await waitForPhase(host, "OPENING");
  return { contexts, pages, host };
}

async function lockStory(pages: Page[]) {
  await waitForPhase(pages[0]!, "STORY_BUILDING");
  for (const page of pages) {
    const unlockedAssignments = page.locator('[data-testid="bank-story-assignment"]:has(button)');
    const ownedCount = await page.getByTestId("bank-story-assignment").count();
    for (let index = 0; index < ownedCount; index += 1) {
      const before = await unlockedAssignments.count();
      if (before === 0) break;
      const choice = unlockedAssignments.first().getByRole("button").first();
      await expect(choice).toBeEnabled();
      await choice.click();
      await expect(unlockedAssignments).toHaveCount(before - 1);
    }
  }
  await Promise.all(pages.map((page) => waitForPhase(page, "FIRST_QUESTION")));
}

async function answerAll(pages: Page[], phase: "FIRST_QUESTION" | "FORENSIC_QUESTION") {
  await waitForPhase(pages[0]!, phase);
  for (const [index, page] of pages.entries()) {
    await page.getByTestId("bank-answer-option").nth(index % 2).click();
    await page.getByRole("button", { name: "ثبّت الإجابة" }).click();
    if (index === 0) {
      await expect(page.getByTestId("bank-answer-receipt")).toContainText("تسجلت إجابتك");
      await expect(page.locator(`[data-phase="${phase}"]`)).toBeVisible();
    }
  }
}

async function playBankCase(browser: Browser, count: 4 | 5 | 6) {
  const room = await createPlayers(browser, count);
  await lockStory(room.pages);
  if (count === 5) {
    await waitForPhase(room.pages[1]!, "FIRST_QUESTION");
    await room.pages[1]!.reload();
    await waitForPhase(room.pages[1]!, "FIRST_QUESTION");
    await expect(room.pages[1]!.getByTestId("bank-answer-option").first()).toBeVisible();
  }
  await answerAll(room.pages, "FIRST_QUESTION");
  await waitForPhase(room.host, "ISSUE_REVEAL");
  await expect(room.host.getByText("المحقق مسك عليكم", { exact: false })).toBeVisible();
  await waitForPhase(room.host, "REPAIR_VOTE");
  await Promise.all(room.pages.map((page) => waitForPhase(page, "REPAIR_VOTE")));
  await expect(room.host.getByTestId("bank-room")).not.toContainText("المنشئ يثبت القرار");
  const alreadyVoted = new Set<Page>();
  if (count === 5) {
    const reconnectingVoter = room.pages[1]!;
    await reconnectingVoter.getByTestId("bank-repair-option").first().click();
    await expect(reconnectingVoter.getByTestId("bank-vote-receipt")).toContainText("3 أصوات متفقة");
    await expect(reconnectingVoter.getByTestId("bank-vote-receipt")).toContainText("التصويت يبقى مفتوح لين يوصل أحد الخيارين للأغلبية");
    await expect(reconnectingVoter.getByTestId("bank-vote-receipt")).not.toContainText("باقي 4");
    await reconnectingVoter.getByTestId("bank-repair-option").nth(1).click();
    await expect(reconnectingVoter.getByTestId("bank-repair-option").nth(1)).toHaveAttribute("aria-pressed", "true");
    alreadyVoted.add(reconnectingVoter);
    await reconnectingVoter.context().setOffline(true);
    await expect(reconnectingVoter.locator(".reconnect-overlay")).toBeVisible();
    await reconnectingVoter.context().setOffline(false);
    await reconnectingVoter.reload();
    await waitForPhase(reconnectingVoter, "REPAIR_VOTE");
    await expect(reconnectingVoter.locator(".reconnect-overlay")).toHaveCount(0, { timeout: 30_000 });
    await expect(reconnectingVoter.getByTestId("bank-vote-receipt")).toContainText("تسجل صوتك");
  }
  const strictMajority = count === 6 ? 4 : 3;
  for (const page of room.pages
    .filter((candidate) => !alreadyVoted.has(candidate))
    .slice(0, strictMajority)) {
    await page.getByTestId("bank-repair-option").first().click();
  }
  await waitForPhase(room.host, "STORY_UPDATE");
  await expect(room.host.getByText("ثبتتوا روايتكم", { exact: false })).toBeVisible();
  await expect(room.host.getByText("سعود وصل باب المقهى", { exact: true })).toBeVisible();
  await answerAll(room.pages, "FORENSIC_QUESTION");
  await waitForPhase(room.host, "GROUP_VERDICT");
  await expect(room.host.getByTestId("bank-group-verdict")).toBeVisible();
  const suspicionText = await room.host.getByTestId("bank-group-verdict").locator("strong bdi").textContent();
  const suspicion = Number(suspicionText?.replace("%", ""));
  const expectedBand = suspicion < 30 ? "طلعتوا نظيفين."
    : suspicion < 60 ? "طلعتوا… لكن بشبهة."
      : suspicion < 85 ? "روايتكم تحت المراقبة."
        : suspicion === 100 ? "انكشفت روايتكم."
          : "انهارت روايتكم.";
  await expect(room.host.getByTestId("bank-group-verdict").getByRole("heading")).toHaveText(expectedBand);
  await waitForPhase(room.host, "PLAYER_RANKING");
  await expect(room.host.getByTestId("bank-ranking")).toBeVisible();
  const rankedRows = room.host.locator("[data-testid='bank-ranking'] ol li");
  if (await rankedRows.count()) {
    await expect(rankedRows).toHaveCount(count);
    for (let index = 0; index < count; index += 1) {
      await expect(rankedRows.nth(index).locator("small")).not.toBeEmpty();
    }
    const scores = await rankedRows.locator(":scope > bdi").allTextContents();
    const ranks = await rankedRows.locator(":scope > span").allTextContents();
    for (let index = 1; index < scores.length; index += 1) {
      if (scores[index] === scores[index - 1]) expect(ranks[index]).toBe(ranks[index - 1]);
    }
  } else {
    await expect(room.host.getByTestId("bank-ranking-incomplete")).toBeVisible();
  }
  await expect(room.host.getByTestId("bank-room")).not.toContainText(/\bP[1-6]\b/);
  return room;
}

for (const count of [4, 5, 6] as const) {
  test(`${count} players complete the canonical nine-screen Bank Al-Saha flow`, async ({ browser }) => {
    test.setTimeout(600_000);
    const { contexts, host } = await playBankCase(browser, count);
    try {
      await expect(host.getByRole("button", { name: "أعيدوا قضية بنك الساحة" })).toBeVisible();
      await host.setViewportSize({ width: 320, height: 568 });
      const width = await host.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(width.scroll).toBe(width.client);
      if (count === 4) {
        await host.getByRole("button", { name: "أعيدوا قضية بنك الساحة" }).click();
        await waitForPhase(host, "OPENING");
      } else if (count === 5) {
        if (process.env.E2E_PRODUCTION === "1") {
          await host.getByRole("button", { name: "أعيدوا قضية بنك الساحة" }).click();
          await waitForPhase(host, "OPENING");
        } else {
          await host.getByRole("button", { name: "مجموعة جديدة" }).click();
          await expect(host).toHaveURL(/\/room\/[A-Z0-9]{4,6}$/);
        }
      }
    } finally {
      await Promise.allSettled(contexts.map((context) => context.close()));
    }
  });
}

test("public routes describe Bank Al-Saha as the available flagship case", async ({ page }) => {
  for (const route of ["/", "/cases", "/create", "/how-to-play"]) {
    await page.goto(route);
    await expect(page.locator("body")).toContainText("بنك الساحة");
    await expect(page.locator("body")).not.toContainText(/تجريبي|بيتا|معاينة|المستودع/);
  }
});

test("100% suspicion has a distinct exposed verdict", async ({ page }) => {
  await page.goto("/e2e/bank-verdict");
  const verdict = page.getByTestId("bank-exposed-verdict");
  await expect(verdict.getByRole("heading")).toHaveText("انكشفت روايتكم.");
  await expect(verdict).toContainText("وصلت الشبهة 100%");
  await expect(verdict).not.toContainText("انهارت روايتكم.");
});

test("vote receipts state strict-majority targets without round language", async ({ page }) => {
  await page.goto("/e2e/bank-verdict");
  await expect(page.getByTestId("bank-vote-status-4")).toContainText("3 أصوات متفقة");
  await expect(page.getByTestId("bank-vote-status-5")).toContainText("3 أصوات متفقة");
  await expect(page.getByTestId("bank-vote-status-6")).toContainText("4 أصوات متفقة");
  for (const count of [4, 5, 6]) {
    const status = page.getByTestId(`bank-vote-status-${count}`);
    await expect(status).toContainText("التصويت يبقى مفتوح لين يوصل أحد الخيارين للأغلبية");
    await expect(status).not.toContainText(/جولة|تعادل|منشئ الغرفة/);
    await expect(status).not.toContainText(`باقي ${count - 1}`);
  }
});
