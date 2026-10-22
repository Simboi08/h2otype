import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { comboDecayRates, decayCombo, getCombo } from "../src/combo";
import { advanceClock, editSession, emptySession } from "../src/typingEngine";
import {
  advanceZen,
  createZen,
  editZen,
  pauseZen,
  resumeZen,
  parseZen,
} from "../src/zenEngine";
import {
  createDaily,
  dailyEdit,
  dailyScore,
  replayDaily,
} from "../src/dailyChallenge";
import type { DailyEvent } from "../src/dailyChallenge";
import { burstPath } from "../src/screenBursts";

const charge = (state: { streak: number; comboDecayFraction: number }) =>
  state.streak - state.comboDecayFraction;

test("higher tiers drain faster and fractional decay is independent of timer frequency", () => {
  expect(comboDecayRates).toEqual([1.5, 3, 5, 8, 12, 16]);
  for (const [previous, next] of [
    [0, 25],
    [25, 60],
    [60, 120],
    [120, 200],
    [200, 350],
  ]) {
    expect(getCombo(previous).percent).toBe(0);
    expect(getCombo(next - 1).percent).toBeGreaterThan(95);
    expect(getCombo(next).tier).toBe(getCombo(next - 1).tier + 1);
    expect(getCombo(previous + 10, 0.5).percent).toBeLessThan(
      getCombo(previous + 10).percent,
    );
  }
  expect(getCombo(1000).percent).toBe(100);
  expect(charge(decayCombo(30, 0, 1000))).toBeCloseTo(27);
  expect(charge(decayCombo(100, 0, 1000))).toBeCloseTo(95);
  expect(charge(decayCombo(400, 0, 1000))).toBeCloseTo(384);
  expect(charge(decayCombo(350, 0, 1000))).toBeCloseTo(337.75); // steps down into the slower tier
  let frequent = { streak: 400, comboDecayFraction: 0 };
  for (let time = 0; time < 120000; time += 100)
    frequent = decayCombo(frequent.streak, frequent.comboDecayFraction, 100);
  const delayed = decayCombo(400, 0, 120000);
  expect(frequent.streak).toBe(delayed.streak);
  expect(charge(frequent)).toBeCloseTo(charge(delayed), 8);
  expect(decayCombo(25, 0, 99999999)).toEqual({
    streak: 0,
    comboDecayFraction: 0,
  });
  expect(decayCombo(100, 0.5, -1)).toEqual({
    streak: 100,
    comboDecayFraction: 0.5,
  });
});

test("decay drains the active multiplier without removing XP or historical best and fresh characters refill it", () => {
  const text = "a".repeat(500);
  let session = editSession(emptySession(), text.slice(0, 100), text, 0, null);
  const xp = session.xpEarned;
  session = advanceClock(session, 20000, null);
  expect(session.streak).toBe(24);
  expect(charge(session)).toBeCloseTo(23.8);
  expect(session.xpEarned).toBe(xp);
  expect(session.bestCombo).toBe(100);
  expect(getCombo(session.streak).multiplier).toBe(1);
  expect(getCombo(session.streak).pitch).toBeLessThan(getCombo(100).pitch);
  const filled = editSession(session, text.slice(0, 101), text, 20000, null);
  expect(charge(filled)).toBeCloseTo(charge(session) + 1);
  const wrong = editSession(filled, filled.typed + "#", text, 20000, null);
  expect(charge(wrong)).toBe(0);
  const deleted = editSession(filled, "", text, 20000, null);
  const repeated = editSession(deleted, filled.typed, text, 20000, null);
  expect(charge(repeated)).toBe(0);
  expect(repeated.xpEarned).toBe(filled.xpEarned);
});

test("deadlines freeze decay and identical native edits earn less bonus after an idle gap", () => {
  const text = "a".repeat(500);
  const initial = editSession(
    emptySession(),
    text.slice(0, 100),
    text,
    0,
    15000,
  );
  const finished = advanceClock(initial, 15000, 15000);
  expect(advanceClock(finished, 99999, 15000)).toEqual(finished);
  const fast = editSession(initial, text.slice(0, 150), text, 0, 15000);
  const slow = editSession(initial, text.slice(0, 150), text, 5000, 15000);
  expect(slow.baseXp).toBe(fast.baseXp);
  expect(slow.bonusTenths).toBeLessThan(fast.bonusTenths);
  expect(slow.xpEarned).toBeLessThan(fast.xpEarned);
});

test("Zen pause/resume and old snapshots retain XP while clearing fractional combo charge", () => {
  let zen = createZen("english100", 1234);
  zen = editZen(zen, zen.passage.slice(0, 100), 0);
  zen = advanceZen(zen, 1000);
  expect(charge(zen.session)).toBeCloseTo(95);
  const paused = pauseZen(zen, 1000);
  expect(charge(paused.session)).toBe(0);
  expect(advanceZen(paused, 999999).session).toEqual(paused.session);
  const resumed = resumeZen(paused, 999999);
  const next = editZen(
    resumed,
    resumed.session.typed + resumed.passage[100],
    999999,
  );
  expect(charge(next.session)).toBe(1);
  const legacy = { ...zen.session } as Partial<typeof zen.session>;
  delete legacy.comboDecayFraction;
  const restored = parseZen(
    JSON.stringify({ version: 1, state: { ...zen, session: legacy } }),
  )!;
  expect(restored.session.xpEarned).toBe(zen.session.xpEarned);
  expect(charge(restored.session)).toBe(0);
  for (const comboDecayFraction of [-0.1, 1, "invalid"])
    expect(
      parseZen(
        JSON.stringify({
          version: 1,
          state: { ...zen, session: { ...zen.session, comboDecayFraction } },
        }),
      ),
    ).toBeNull();
});

test("Daily replay matches a browser clock with frequent ticks, gaps, mistakes and reset events", () => {
  const daily = createDaily("2026-10-20");
  let session = emptySession();
  const events: DailyEvent[] = [];
  for (let at = 0; at < 14000; at += 37) {
    session = advanceClock(session, at, 15000);
    if (at % 111 === 0) {
      const value =
        session.typed +
        daily.passage.slice(session.typed.length, session.typed.length + 2);
      const next = editSession(session, value, daily.passage, at, 15000);
      events.push(dailyEdit(session, next)!);
      session = next;
    }
  }
  const replay = replayDaily(daily.day, events);
  expect(replay.score).toBe(dailyScore(session));
  expect(replay.session.bestCombo).toBe(session.bestCombo);
  const resetTrace: DailyEvent[] = [
    { at: 0, add: daily.passage.slice(0, 100) },
    { at: 5000, reset: true },
    { at: 6000, add: daily.passage.slice(100, 150) },
  ];
  expect(replayDaily(daily.day, resetTrace).score).toBeLessThan(
    replayDaily(daily.day, [{ at: 0, add: daily.passage.slice(0, 150) }]).score,
  );
});

test("finish origins cover the full sides and lightly populate both horizontal borders", () => {
  const paths = Array.from({ length: 240 }, (_, index) =>
    burstPath("finish", index, 1280, 720),
  );
  for (const edge of ["left", "right"]) {
    const pieces = paths.filter((p) => p.edge === edge);
    expect(pieces).toHaveLength(84);
    expect(Math.min(...pieces.map((p) => p.top))).toBeLessThan(120);
    expect(Math.max(...pieces.map((p) => p.top))).toBeGreaterThan(600);
  }
  expect(paths.filter((p) => p.edge === "top")).toHaveLength(48);
  expect(paths.filter((p) => p.edge === "bottom")).toHaveLength(24);
  const top = paths.filter((p) => p.edge === "top");
  expect(
    Math.max(...top.map((p) => p.left)) - Math.min(...top.map((p) => p.left)),
  ).toBeGreaterThan(900);
  expect(
    paths.every(
      (p) => p.left >= 0 && p.left <= 1280 && p.top >= 0 && p.top <= 720,
    ),
  ).toBe(true);
});

async function ready(page: Page) {
  await page.clock.install({ time: new Date("2026-10-20T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-20T12:01:00Z"));
  await page.goto("/");
  await expect(page.getByRole("textbox")).toBeFocused();
}

test("idle combo meter drains smoothly, loses tiers and refills in Sprint and Zen without losing earned XP", async ({
  page,
}) => {
  await ready(page);
  for (const mode of ["Sprint", "Zen"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page
      .getByRole("textbox")
      .fill((await page.locator(".passage").textContent())!.slice(0, 100));
    await expect(page.getByRole("meter")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    const xp = await page.locator(".xp-value").textContent();
    const width = () =>
      page
        .locator(".combo-track > span")
        .evaluate((n) => parseFloat((n as HTMLElement).style.width));
    await page.clock.runFor(300); // let the initial whole-bar upgrade finish
    const before = await width();
    await page.clock.runFor(1000);
    await expect(page.getByRole("meter")).toHaveAttribute(
      "aria-valuenow",
      "94",
    );
    expect(await width()).toBeLessThan(before);
    expect(await page.locator(".xp-value").textContent()).toBe(xp);
    const prior = await page.getByRole("meter").getAttribute("aria-valuenow");
    const passage = (await page.locator(".passage").textContent())!;
    await page.keyboard.insertText(passage.slice(100, 110));
    expect(
      Number(await page.getByRole("meter").getAttribute("aria-valuenow")),
    ).toBeGreaterThan(Number(prior));
  }
});

test("actual finish confetti launches along all four edges without taking focus or clicks", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("textbox").press("a");
  await page.clock.fastForward(15000);
  await expect(page.locator(".finish-confetti i")).toHaveCount(240);
  for (const edge of ["left", "right", "top", "bottom"])
    await expect(
      page.locator(`.finish-confetti i[data-edge="${edge}"]`),
    ).not.toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Sprint results" }),
  ).toBeFocused();
  await expect(page.locator(".finish-confetti")).toHaveCSS(
    "pointer-events",
    "none",
  );
  await page.keyboard.press("Tab");
  await expect(page.locator(".finish-confetti i")).toHaveCount(0);
});

test("meter drains linearly, hides at expiry and returns only with fresh charge", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  const text = (await page.locator(".passage").textContent())!;
  await page.getByRole("textbox").fill(text.slice(0, 25));
  await page.clock.runFor(500);
  const samples: number[] = [];
  for (let frame = 0; frame < 6; frame++) {
    await page.clock.runFor(16);
    samples.push(
      await page
        .locator(".combo-track > span")
        .evaluate((n) => parseFloat((n as HTMLElement).style.width)),
    );
  }
  const deltas = samples.slice(1).map((value, index) => samples[index] - value);
  expect(deltas[0]).toBeGreaterThan(0);
  for (const delta of deltas) expect(delta).toBeCloseTo(deltas[0], 3);
  await page.clock.runFor(500);
  await expect(page.locator(".combo-meter")).toHaveAttribute("data-tier", "0");
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "23");
  await page.clock.runFor(20000);
  await expect(page.getByRole("meter")).toHaveCount(0);
  await expect(page.getByText("Build combo", { exact: true })).toHaveCount(0);
  await page.clock.runFor(1000);
  await expect(page.getByRole("meter")).toHaveCount(0);
  await page.keyboard.insertText(text[25]);
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "1");
  await expect(page.locator(".combo-meter")).toContainText("Build combo");
  await expect(page.getByRole("textbox")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("meter")).toHaveCount(0);
});
