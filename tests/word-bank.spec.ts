import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { generateWords, wordPools } from "../src/wordBank";
import {
  createZen,
  editZen,
  parseZen,
  pauseZen,
  resumeZen,
  zenMetrics,
} from "../src/zenEngine";

const text = async (page: Page) =>
  (await page.locator(".passage").textContent())!;
const xp = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("h2otype.progress.v1")!).totalXp,
  );
async function choose(page: Page, label: string) {
  await page
    .getByRole("button", { name: "Choose word set", exact: true })
    .click();
  await page
    .locator(".wordset-option")
    .filter({ has: page.getByText(label, { exact: true }) })
    .click();
}
async function ready(page: Page) {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T12:01:00Z"));
  await page.goto("/");
  await page.getByRole("button", { name: "30s", exact: true }).click();
}

test("local pools are distinct nested common-word sets and seeded batches continue without adjacent repeats", () => {
  for (const [set, size] of [
    ["english100", 100],
    ["english500", 500],
    ["english1000", 1000],
  ] as const) {
    const pool = wordPools[set];
    expect(pool).toHaveLength(size);
    expect(new Set(pool).size).toBe(size);
    expect(pool.every((word) => /^[a-z]{1,14}$/.test(word))).toBe(true);
    const first = generateWords(set, 12345, 80);
    expect(generateWords(set, 12345, 80)).toEqual(first);
    expect(generateWords(set, 54321, 80).text).not.toBe(first.text);
    const words = first.text.trim().split(" ");
    const next = generateWords(set, first.randomState, 80, words.at(-1));
    const combined = (first.text + next.text).trim().split(" ");
    expect(
      combined.every(
        (word, index) => pool.includes(word) && word !== combined[index - 1],
      ),
    ).toBe(true);
    expect(generateWords(set, 12345, 160).text).toBe(first.text + next.text);
  }
  expect(wordPools.english500.slice(0, 100)).toEqual(wordPools.english100);
  expect(wordPools.english1000.slice(0, 500)).toEqual(wordPools.english500);
});

test("generated Zen stays bounded, resumes identical future words, and never replays retired XP", () => {
  for (const set of ["english100", "english500", "english1000"] as const) {
    let state = createZen(set, 12345);
    let total = 0;
    for (let index = 0; index < 60; index++) {
      total += state.passage.length - state.session.typed.length;
      state = editZen(state, state.passage, index * 1000);
      expect(state.session.endedAt).toBeNull();
      expect(state.session.typed.length).toBeLessThanOrEqual(600);
      expect(state.passage.length).toBeLessThan(2000);
      expect(
        state.passage.length - state.session.typed.length,
      ).toBeGreaterThanOrEqual(200);
      expect(state.session.baseXp).toBe(total);
    }
    const restored = parseZen(
      JSON.stringify({ version: 1, state: pauseZen(state, 60000) }),
    )!;
    expect(restored).not.toBeNull();
    expect(restored.passage).toBe(state.passage);
    expect(restored.randomState).toBe(state.randomState);
    const resumed = resumeZen(restored, 61000);
    expect(editZen(resumed, resumed.passage, 62000).passage).toBe(
      editZen(state, state.passage, 62000).passage,
    );
    const corrected = editZen(
      editZen(resumed, resumed.session.typed.slice(0, -1), 62000),
      resumed.session.typed,
      63000,
    );
    expect(corrected.session.xpEarned).toBe(state.session.xpEarned);
    expect(zenMetrics(corrected, 64000).correctCharacters).toBe(total);
  }
});

test("old Zen drafts retain sentences while invalid pool or generator state is rejected", () => {
  const state = editZen(
    createZen("english500", 12345),
    createZen("english500", 12345).passage.slice(0, 8),
    1000,
  );
  for (const invalid of [
    { wordSet: "unknown" },
    { randomState: 0 },
    { randomState: -1 },
    { randomState: 2 ** 32 },
    { randomState: 0.5 },
    { randomState: undefined },
  ]) {
    expect(
      parseZen(JSON.stringify({ version: 1, state: { ...state, ...invalid } })),
    ).toBeNull();
  }
  const legacy = { ...editZen(createZen(), "there", 1000) } as Partial<
    typeof state
  >;
  delete legacy.wordSet;
  delete legacy.randomState;
  const restored = parseZen(JSON.stringify({ version: 1, state: legacy }))!;
  expect(restored.wordSet).toBe("sentences");
  expect(restored.session.typed).toBe("there");
  expect(restored.session.xpEarned).toBe(5);
});

test("fresh installs use English 100, Tab reshuffles, and picker cancel or reselect keeps a run", async ({
  page,
}) => {
  await ready(page);
  const input = page.getByRole("textbox");
  await expect(input).toBeFocused();
  await expect(page.locator(".wordset-button")).toContainText("English 100");
  const initial = await text(page);
  expect(initial.trim().split(" ")).toHaveLength(600);
  expect(
    initial
      .trim()
      .split(" ")
      .every((word) => wordPools.english100.includes(word)),
  ).toBe(true);
  await page.getByRole("button", { name: "60s", exact: true }).click();
  const passage = await text(page);
  const first = passage.split(" ")[0];
  await input.pressSequentially(first);
  await page.keyboard.press("F3");
  const close = page.getByRole("button", { name: "Close word sets" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".wordset-option").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("F2");
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(first);
  await choose(page, "English 100");
  await expect(input).toHaveValue(first);
  expect(await text(page)).toBe(passage);
  await input.press("Tab");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("timer")).toHaveText("60s remaining");
  expect(await text(page)).not.toBe(passage);
  expect(await xp(page)).toBe(first.length);
});

test("word-set choices apply immediately in both modes and persist independently from display settings", async ({
  page,
}) => {
  await ready(page);
  const input = page.getByRole("textbox");
  await input.fill((await text(page)).slice(0, 15));
  await choose(page, "English 500");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("timer")).toHaveText("30s remaining");
  let passage = await text(page);
  expect(
    passage
      .trim()
      .split(" ")
      .every((word) => wordPools.english500.includes(word)),
  ).toBe(true);
  expect(
    passage
      .trim()
      .split(" ")
      .some((word) => !wordPools.english100.includes(word)),
  ).toBe(true);
  expect(await xp(page)).toBe(15);
  await page.reload();
  await expect(page.locator(".wordset-button")).toContainText("English 500");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  passage = await text(page);
  expect(
    passage
      .trim()
      .split(" ")
      .every((word) => wordPools.english500.includes(word)),
  ).toBe(true);
  await input.fill(passage.slice(0, 40));
  expect(await xp(page)).toBe(58);
  await choose(page, "English 1,000");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("timer")).toHaveText("0s elapsed");
  const fresh = await text(page);
  await input.fill(fresh.slice(0, 12));
  expect(await xp(page)).toBe(70); // A fresh ledger must not subtract the old 40 XP.
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("h2otype.progress.v1")!).zen,
  );
  expect(saved.wordSet).toBe("english1000");
  expect(saved.session.xpEarned).toBe(12);
  await page.reload();
  await expect(page.locator(".wordset-button")).toContainText("English 1,000");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zen paused" })).toBeFocused();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  expect(await text(page)).toBe(saved.passage);
  await expect(input).toHaveValue(saved.session.typed.split(" ").at(-1)!);
  await input.press("Backspace");
  await input.press(saved.session.typed.at(-1)!);
  expect(await xp(page)).toBe(70);
});

test("switching sets in Sprint clears an old Zen draft without losing XP, including from a paused summary", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("textbox").fill((await text(page)).slice(0, 20));
  await page.getByRole("button", { name: "Sprint", exact: true }).click();
  await choose(page, "English 500");
  expect(await xp(page)).toBe(20);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(page.getByRole("textbox")).toBeFocused();
  await page.getByRole("textbox").fill((await text(page)).slice(0, 10));
  expect(await xp(page)).toBe(30);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.keyboard.press("F3");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Zen paused" })).toBeFocused();
  await choose(page, "English sentences");
  await expect(page.getByRole("textbox")).toBeFocused();
  expect(await text(page)).toMatch(/^there is/);
  await page.getByRole("textbox").pressSequentially("there");
  expect(await xp(page)).toBe(35);
});

test("existing Zen drafts choose their original sentences even when a new word preference exists", async ({
  page,
}) => {
  const state = editZen(createZen(), "there", 1000);
  await page.addInitScript((state) => {
    const legacy: Partial<typeof state> = { ...state };
    delete legacy.wordSet;
    delete legacy.randomState;
    localStorage.setItem(
      "h2otype.progress.v1",
      JSON.stringify({ version: 1, totalXp: 55, zen: legacy }),
    );
    localStorage.setItem("h2otype.word-set.v1", '"english500"');
  }, state);
  await ready(page);
  await expect(page.locator(".wordset-button")).toContainText(
    "English sentences",
  );
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("there");
  await page.getByRole("textbox").press(" ");
  expect(await xp(page)).toBe(56);
});

test("Sprint bests are separate per pool and duration while original sentence records remain intact", async ({
  page,
}) => {
  await ready(page);
  const input = page.getByRole("textbox");
  await page.getByRole("button", { name: "15s", exact: true }).click();
  await input.fill((await text(page)).slice(0, 50));
  await page.clock.fastForward(15000);
  await expect(page.locator(".record-summary")).toContainText(
    "New best · 15s: 40 WPM",
  );
  await choose(page, "English 500");
  await input.fill((await text(page)).slice(0, 10));
  await page.clock.fastForward(15000);
  await expect(page.locator(".record-summary")).toContainText(
    "New best · 15s: 8 WPM",
  );
  await choose(page, "English sentences");
  await input.pressSequentially("slow down ");
  await page.clock.fastForward(15000);
  await expect(page.locator(".record-summary")).toContainText(
    "New best · 15s: 8 WPM",
  );
  const sentenceBest = await page.evaluate(() =>
    localStorage.getItem("h2otype.sprint-bests.v1"),
  );
  expect(JSON.parse(sentenceBest!).bests[15].wpm).toBe(8);
  await choose(page, "English 100");
  await input.fill((await text(page)).slice(0, 5));
  await page.clock.fastForward(15000);
  await expect(page.locator(".record-summary")).toContainText(
    "Personal best · 15s: 40 WPM",
  );
  await page.getByRole("button", { name: "30s", exact: true }).click();
  await input.fill((await text(page)).slice(0, 20));
  await page.clock.fastForward(30000);
  await expect(page.locator(".record-summary")).toContainText(
    "New best · 30s: 8 WPM",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("h2otype.sprint-bests.v1")),
  ).toBe(sentenceBest);
});

test("unavailable word storage keeps in-memory choices, generated Zen, and XP accounting usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Quota exceeded");
    };
  });
  await ready(page);
  await choose(page, "English 500");
  await page.keyboard.press("F3");
  await expect(
    page.locator(".wordset-dialog").getByRole("status"),
  ).toContainText("cannot be saved");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("textbox").fill((await text(page)).slice(0, 30));
  await choose(page, "English 1,000");
  await page.getByRole("textbox").fill((await text(page)).slice(0, 10));
  await expect(page.locator(".progress-unsaved")).toContainText("XP not saved");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.locator(".session-xp")).toHaveText("+10 XP this session");
  await expect(
    page.getByRole("progressbar", { name: "Level XP" }),
  ).toHaveAttribute("aria-valuenow", "41");
});

test("word picker, settings, and game header fit phones, tablets, and landscape without overlapping controls", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 768, height: 800 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "30s", exact: true }).click();
    await choose(page, "English sentences");
    const mode = (await page.locator(".mode-switch").boundingBox())!;
    const tools = (await page.locator(".header-tools").boundingBox())!;
    const brand = (await page.locator(".wordmark").boundingBox())!;
    expect(brand.x + brand.width).toBeLessThanOrEqual(mode.x);
    expect(mode.x + mode.width).toBeLessThanOrEqual(tools.x);
    expect(tools.x + tools.width).toBeLessThanOrEqual(viewport.width);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    await page.keyboard.press("F3");
    const dialog = page.getByRole("dialog", { name: "Word sets" });
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    await page.locator(".wordset-option").last().focus();
    await expect(page.locator(".wordset-option").last()).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("textbox")).toBeFocused();
  }
});

test("malformed or unknown word choices fall back safely and can be replaced", async ({
  page,
}) => {
  // This exercises three corrupt saves with six reloads and two modal visits each.
  test.setTimeout(60000);
  for (const raw of ["{broken", '"unknown"', '{"wordSet":"english500"}']) {
    await page.goto("/");
    await page.getByRole("button", { name: "30s", exact: true }).click();
    await page.evaluate(
      (raw) => localStorage.setItem("h2otype.word-set.v1", raw),
      raw,
    );
    await page.reload();
    await expect(page.locator(".wordset-button")).toContainText("English 100");
    await page.keyboard.press("F3");
    await expect(
      page.locator(".wordset-dialog .settings-storage-note"),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await choose(page, "English 500");
    await page.reload();
    await expect(page.locator(".wordset-button")).toContainText("English 500");
  }
});
