import { expect, test } from "./practice-fixture";
import type { Page } from "@playwright/test";

async function ready(page: Page) {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T12:01:00Z"));
  await page.goto("/");
  await page.getByRole("button", { name: "30s", exact: true }).click();
}
async function audioProbe(page: Page, volume = 35) {
  await page.addInitScript((volume) => {
    localStorage.setItem(
      "h2otype.preferences.v1",
      JSON.stringify({
        version: 1,
        preferences: { soundStyle: "standard", soundVolume: volume },
      }),
    );
    const notes: { duration: number; stopped: boolean }[] = [];
    (window as typeof window & { finishNotes: typeof notes }).finishNotes =
      notes;
    const start = AudioBufferSourceNode.prototype.start;
    const stop = AudioBufferSourceNode.prototype.stop;
    const entries = new WeakMap<
      AudioBufferSourceNode,
      (typeof notes)[number]
    >();
    AudioBufferSourceNode.prototype.start = function (...args) {
      const entry = { duration: this.buffer!.duration, stopped: false };
      notes.push(entry);
      entries.set(this, entry);
      return Reflect.apply(start, this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) {
      const entry = entries.get(this);
      if (entry) entry.stopped = true;
      return Reflect.apply(stop, this, args);
    };
  }, volume);
}
const finishes = (page: Page) =>
  page.evaluate(() =>
    (
      window as typeof window & {
        finishNotes: { duration: number; stopped: boolean }[];
      }
    ).finishNotes.filter((note) => note.duration > 0.5),
  );

test("Sprint plays one finish phrase, never replays on settings changes, and restart cancels it", async ({
  page,
}) => {
  await audioProbe(page);
  await ready(page);
  await page.getByRole("button", { name: "15s", exact: true }).click();
  await page.getByRole("textbox").pressSequentially("slow");
  await page.clock.fastForward(15000);
  await expect(
    page.getByRole("heading", { name: "Sprint results" }),
  ).toBeFocused();
  await expect.poll(async () => (await finishes(page)).length).toBe(1);
  await page.keyboard.press("F2");
  await page
    .getByRole("combobox", { name: "Typing sound", exact: true })
    .selectOption("bitcrush");
  await page.keyboard.press("Escape");
  expect(await finishes(page)).toHaveLength(1);
  await page.keyboard.press("Tab");
  expect((await finishes(page))[0].stopped).toBe(true);
  await expect(page.getByRole("textbox")).toBeFocused();
});

test("muted tests stay silent and Zen only celebrates explicit Finish, not Pause or restored summaries", async ({
  page,
}) => {
  await audioProbe(page, 0);
  await ready(page);
  await page.getByRole("textbox").pressSequentially("slow");
  await page.clock.fastForward(30000);
  expect(await finishes(page)).toHaveLength(0);
  await page.keyboard.press("F2");
  await page
    .getByRole("slider", { name: "Sound volume", exact: true })
    .press("End");
  await page.keyboard.press("Escape");
  expect(await finishes(page)).toHaveLength(0);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("textbox").pressSequentially("there");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(await finishes(page)).toHaveLength(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect.poll(async () => (await finishes(page)).length).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  expect(await finishes(page)).toHaveLength(0);
});

test("shake only rewards actual tier upgrades, with no pulses between upgrades", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const durations: number[] = [];
    (window as typeof window & { shakeDurations: number[] }).shakeDurations =
      durations;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.classList.contains("practice-surface"))
        durations.push(
          Number(typeof options === "number" ? options : options?.duration),
        );
      return animate.call(this, frames, options);
    };
  });
  await ready(page);
  const passage = (await page.locator(".passage").textContent())!;
  const input = page.getByRole("textbox");
  await input.pressSequentially(passage.slice(0, 25));
  await page.clock.runFor(300);
  await page.keyboard.insertText(passage.slice(25, 60));
  await page.clock.runFor(300);
  await page.keyboard.insertText(passage.slice(60, 119));
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { shakeDurations: number[] }).shakeDurations,
    ),
  ).toEqual([220, 220]);
  await input.press(passage[119]);
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { shakeDurations: number[] }).shakeDurations,
    ),
  ).toEqual([220, 220, 220]);
});

test("results show base and bonus XP, best combo and readable main statistics", async ({
  page,
}) => {
  await ready(page);
  const passage = (await page.locator(".passage").textContent())!;
  await page.getByRole("textbox").fill(passage.slice(0, 100));
  await page.clock.fastForward(30000);
  await expect(page.getByTestId("base-xp")).toHaveText("100");
  await expect(page.getByTestId("bonus-xp")).toHaveText("+27 XP");
  await expect(page.getByTestId("best-combo")).toHaveText("100 chars");
  await expect(page.locator(".session-xp")).toHaveText("+127 XP this run");
  await expect(page.getByTestId("result-wpm")).toHaveText("40");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox")).toBeFocused();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("h2otype.progress.v1")!).totalXp,
    ),
  ).toBe(127);
});

test("Daily fixes its text and duration, saves score-ranked attempts, and preserves Sprint and Zen data", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("textbox").pressSequentially("there");
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  const input = page.getByRole("textbox");
  await expect(input).toBeFocused();
  await expect(page.getByRole("timer")).toHaveText("15s remaining");
  await expect(
    page.getByRole("button", { name: "Choose word set" }),
  ).toBeDisabled();
  const passage = (await page.locator(".passage").textContent())!;
  await input.fill(passage.slice(0, 100));
  await page.clock.fastForward(15000);
  await expect(
    page.getByRole("heading", { name: "Daily results" }),
  ).toBeFocused();
  await expect(page.getByTestId("daily-score")).toHaveText("1,275");
  await expect(page.getByTestId("bonus-xp")).toHaveText("+27 XP");
  await page
    .getByRole("button", { name: "Daily rankings", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Scores on this browser" }),
  ).toBeVisible();
  await expect(page.locator(".current-score")).toContainText("1,275");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Daily results" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  expect(await page.locator(".passage").textContent()).toBe(passage);
  await input.fill(passage.slice(0, 50));
  await page.clock.fastForward(15000);
  await page
    .getByRole("button", { name: "Daily rankings", exact: true })
    .click();
  const rows = page.locator(".daily-rankings tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("1,275");
  await expect(rows.last()).toContainText("552");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(input).toHaveValue("there");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("h2otype.sprint-bests.english100.v1"),
    ),
  ).toBeNull();
  await page.reload();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("h2otype.daily-scores.v3")!).records
          .length,
    ),
  ).toBe(2);
});

test("Daily results and rankings fit narrow phones and short landscape screens, including unsaved XP", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Quota exceeded");
    };
  });
  await ready(page);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "30s", exact: true }).click();
    await page.getByRole("button", { name: "Daily", exact: true }).click();
    const passage = (await page.locator(".passage").textContent())!;
    await page.getByRole("textbox").fill(passage.slice(0, 100));
    await page.clock.fastForward(15000);
    await expect(
      page.getByRole("heading", { name: "Daily results" }),
    ).toBeFocused();
    const bounds = (await page.locator(".typing-space").boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Daily rankings", exact: true })
      .click();
    const modal = (await page
      .getByRole("dialog", { name: "Daily rankings" })
      .boundingBox())!;
    expect(modal.y).toBeGreaterThanOrEqual(0);
    expect(modal.y + modal.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Escape");
  }
});

test("Daily stays on its starting date across UTC midnight and refreshes on restart", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-19T23:58:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T23:59:50Z"));
  await page.goto("/");
  await page.getByRole("button", { name: "30s", exact: true }).click();
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  const initial = await page.locator(".passage").textContent();
  await page.getByRole("textbox").press(initial![0]);
  await page.clock.fastForward(15000);
  await expect(page.locator(".results-context")).toContainText("2026-10-19");
  await page.keyboard.press("Tab");
  await expect(page.locator(".daily-label")).toContainText("2026-10-20");
  expect(await page.locator(".passage").textContent()).not.toBe(initial);
});

test("shared Daily submission sends the run for server replay and renders the returned leaderboard", async ({
  page,
}) => {
  const { handleDaily } = await import("../server/dailyApi");
  const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const scores: {
    display_name: string;
    score: number;
    wpm: number;
    accuracy: number;
    best_combo: number;
  }[] = [];
  let submissions = 0;
  await page.route("**/api/daily", async (route) => {
    const response = await handleDaily(
      new Request("http://127.0.0.1:4173/api/daily", {
        method: "POST",
        body: route.request().postData(),
      }),
      {},
      {
        begin: async (day) => ({
          id,
          day,
          started_at: "2026-10-19T12:00:00Z",
          used: false,
          rules_version: 3,
        }),
        run: async () => ({
          id,
          day: "2026-10-19",
          started_at: "2026-10-19T12:00:00Z",
          used: false,
          rules_version: 3,
        }),
        list: async () => scores,
        complete: async (record) => {
          submissions++;
          scores.push({
            display_name: String(record.p_name),
            score: Number(record.p_score),
            wpm: Number(record.p_wpm),
            accuracy: Number(record.p_accuracy),
            best_combo: Number(record.p_combo),
          });
        },
      },
      Date.parse("2026-10-19T12:01:00Z"),
    );
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: await response.text(),
    });
  });
  await ready(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  const passage = (await page.locator(".passage").textContent())!;
  await page.getByRole("textbox").fill(passage.slice(0, 100));
  await page.clock.fastForward(15000);
  await page
    .getByRole("button", { name: "Daily rankings", exact: true })
    .click();
  await page.getByLabel("Display name", { exact: false }).fill("Simon");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Daily rankings" }).getByRole("status"),
  ).toContainText("Score submitted");
  expect(submissions).toBe(1);
  expect(scores).toEqual([
    {
      display_name: "Simon",
      score: 1275,
      wpm: 80,
      accuracy: 100,
      best_combo: 100,
    },
  ]);
  await expect(page.locator(".daily-rankings table").first()).toContainText(
    "Simon",
  );
  await expect(
    page.getByRole("button", { name: "Submit score", exact: true }),
  ).toHaveCount(0);
});
