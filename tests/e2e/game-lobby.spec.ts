import { test, expect, type Page } from "@playwright/test";

/** Fill a text input reliably (React-controlled) then return. */
async function typeInto(page: Page, selector: string, value: string) {
  await page.locator(selector).click();
  await page.locator(selector).fill(value);
}

test.describe("realtime lobby (multi-client)", () => {
  test("host creates a room and a second player joins the same roster", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const joinCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const joiner = await joinCtx.newPage();

    // Host creates a room.
    await host.goto("/create");
    await expect(host.locator("html")).toHaveAttribute("data-hydrated", "true");
    await typeInto(host, "#name", "نواف");
    const createButton = host.getByRole("button", { name: "أنشئ الغرفة" });
    await expect(createButton).toBeEnabled({ timeout: 90_000 });
    await createButton.click();
    await expect(host).toHaveURL(/\/room\/[A-Z0-9]{4,6}$/);
    const code = host.url().split("/room/")[1]!;
    await expect(host.getByText("رمز الغرفة")).toBeVisible();
    await expect(host.getByText(code)).toBeVisible();
    await host.evaluate(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: (data: ShareData) => {
          sessionStorage.setItem("shared-room-url", String(data.url));
          return Promise.resolve();
        },
      });
    });
    await host.getByRole("button", { name: "شارك رابط الدخول" }).click();
    await expect(host.getByText("تمت المشاركة")).toBeVisible();
    expect(await host.evaluate(() => sessionStorage.getItem("shared-room-url"))).toBe(
      `${new URL(host.url()).origin}/join?code=${code}`,
    );

    // Second player joins by code.
    await joiner.goto(`/play?code=${code}`);
    await expect(joiner.locator("html")).toHaveAttribute("data-hydrated", "true");
    await typeInto(joiner, "#pname", "سعد");
    await joiner.getByRole("button", { name: "ادخل الغرفة" }).click();
    await expect(joiner).toHaveURL(/\/room\/[A-Z0-9]{4,6}$/);

    // Both clients should see both players in the roster.
    await expect(host.getByText("سعد")).toBeVisible({ timeout: 10_000 });
    await expect(joiner.getByText("نواف", { exact: false })).toBeVisible();

    // A refresh must restore the same private session and replace the old socket.
    await joiner.reload();
    await expect(joiner.locator("html")).toHaveAttribute("data-hydrated", "true");
    await expect(joiner).toHaveURL(new RegExp(`/room/${code}$`));
    await expect(joiner.getByText("نواف", { exact: false })).toBeVisible({
      timeout: 10_000,
    });
    await expect(host.getByText("سعد")).toBeVisible();

    // Host sees the start guard until 4 players are present.
    await expect(host.getByText("نحتاج ٤ لاعبين على الأقل")).toBeVisible();

    await hostCtx.close();
    await joinCtx.close();
  });
});
