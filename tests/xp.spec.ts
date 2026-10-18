import { expect, test } from "@playwright/test";
const key = "h2otype.progress.v1";
async function total(page: import("@playwright/test").Page) {
  return page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key) ?? '{"totalXp":0}')
        .totalXp as number,
    key,
  );
}

test("Sprint credits once per position, persists immediately, and restart alone adds nothing", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.pressSequentially("slx");
  expect(await total(page)).toBe(2);
  await input.press("Backspace");
  await input.press("o");
  expect(await total(page)).toBe(3);
  await input.press("Backspace");
  await input.press("o");
  expect(await total(page)).toBe(3);
  await page.keyboard.down("w");
  await page.keyboard.down("w");
  await page.keyboard.up("w");
  expect(await total(page)).toBe(4);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  expect(await total(page)).toBe(4);
  await page.reload();
  expect(await total(page)).toBe(4);
  await expect(
    page.getByRole("progressbar", { name: "Level XP" }),
  ).toHaveAttribute("aria-valuenow", "4");
  await input.press("s");
  expect(await total(page)).toBe(5);
});

test("a level-up never takes typing focus and session XP appears in results", async ({
  page,
}) => {
  await page.addInitScript(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, totalXp: 99, zen: null }),
      ),
    key,
  );
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-18T12:00:00Z"));
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.press("s");
  await expect(page.locator(".progress-notice")).toHaveText("Level 2");
  await expect(input).toBeFocused();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuemax",
    "200",
  );
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await page.clock.fastForward(4000);
  await expect(page.locator(".progress-notice")).toHaveText("");
  await page.clock.fastForward(26_000);
  await expect(page.locator(".session-xp")).toHaveText("+1 XP this run");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  expect(await total(page)).toBe(100);
});

test("Zen reload before autosave cannot replay credited positions or reset lifetime XP", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  const input = page.getByRole("textbox");
  await input.pressSequentially("there ");
  expect(await total(page)).toBe(6);
  await page.reload();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await input.press("Backspace");
  await input.press("Space");
  expect(await total(page)).toBe(6);
  await input.press("i");
  expect(await total(page)).toBe(7);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.locator(".session-xp")).toHaveText("+7 XP this session");
  await page.getByRole("button", { name: "New session", exact: true }).click();
  expect(await total(page)).toBe(7);
});

test("retiring Zen history and repeated pause/resume keep XP totals exact", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  const input = page.getByRole("textbox");
  for (let i = 0; i < 4; i++) {
    const text = await page.locator(".passage").innerText();
    const typed = await page.locator(".character.correct").count();
    const word = await input.inputValue();
    await input.fill(text.slice(typed - word.length));
  }
  const earned = await total(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await input.press("Backspace");
  await input.press("Space");
  expect(await total(page)).toBe(earned);
  await page.reload();
  expect(await total(page)).toBe(earned);
});

test("pre-XP drafts migrate without retroactive XP or deletion of old personal bests", async ({
  page,
}) => {
  await page.addInitScript(async () => {
    // Legacy snapshot shape from Milestone 3 (no XP fields).
    const passage = "there is no hurry to get anywhere. ".repeat(9);
    localStorage.setItem(
      "h2otype.zen-session.v1",
      JSON.stringify({
        version: 1,
        state: {
          session: {
            typed: "there",
            startedAt: 0,
            endedAt: null,
            now: 1000,
            attempts: 5,
            correctAttempts: 5,
          },
          passage,
          batch: 2,
          bankedCorrect: 0,
          elapsedMs: 1000,
          runningSince: null,
          paused: true,
          summary: false,
        },
      }),
    );
    localStorage.setItem(
      "h2otype.sprint-bests.v1",
      JSON.stringify({ version: 1, bests: { 30: { wpm: 50, accuracy: 99 } } }),
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  const input = page.getByRole("textbox");
  await input.press("Backspace");
  await input.press("e");
  expect(await total(page)).toBe(0);
  await input.press("Space");
  expect(await total(page)).toBe(1);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("h2otype.sprint-bests.v1")!).bests[30]
          .wpm,
    ),
  ).toBe(50);
});

test("storage failures leave XP visible in memory and disclose that it is unsaved", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Quota exceeded");
    };
  });
  await page.goto("/");
  await page.getByRole("textbox").pressSequentially("slow");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "4",
  );
  await expect(page.getByText("XP not saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "4",
  );
});
