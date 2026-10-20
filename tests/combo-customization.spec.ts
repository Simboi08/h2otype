import { expect, test } from "./practice-fixture";
import type { Page } from "@playwright/test";
import { advanceCombo, getCombo } from "../src/combo";
import { editSession, emptySession } from "../src/typingEngine";
import { createZen, editZen } from "../src/zenEngine";
import { defaultPreferences, parsePreferences } from "../src/preferences";
import { setGraphicsQuality } from "./settings";

async function clock(page: Page) {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T12:01:00Z"));
}

test("spacing, stat sizes, and combo preference validate independently without losing old saves", () => {
  const parse = (preferences: Record<string, unknown>) =>
    parsePreferences(JSON.stringify({ version: 1, preferences }));
  expect(
    parse({
      graphicsTier: "high",
      characterSpacing: 1.5,
      wpmScale: 200,
      accuracyScale: 80,
      comboFeedback: false,
    }),
  ).toEqual({
    ...defaultPreferences,
    graphicsTier: "high",
    characterSpacing: 1.5,
    wpmScale: 200,
    accuracyScale: 80,
    comboFeedback: false,
  });
  for (const value of [-1, 3.5, 0.2, "1", null])
    expect(parse({ characterSpacing: value }).characterSpacing).toBe(0);
  for (const value of [0, 70, 210, 95, "100", null]) {
    const result = parse({
      wpmScale: value,
      accuracyScale: value,
      liveWpm: true,
      comboFeedback: "yes",
    });
    expect(result).toEqual({ ...defaultPreferences, liveWpm: true });
  }
  expect(parse({ typingFont: "serif", graphicsTier: "low" })).toEqual({
    ...defaultPreferences,
    typingFont: "serif",
    graphicsTier: "low",
  });
});

test("combos count new correct positions, reset on errors/deletion, and cannot be farmed by retyping", () => {
  const passage = "😀abcdefghij klmnopqrstuvwxyz";
  const initial = emptySession();
  const first = editSession(initial, "😀abcdefghij", passage, 1, null);
  expect(advanceCombo(0, initial, first, passage)).toBe(11);
  const deleted = editSession(first, "", passage, 2, null);
  expect(advanceCombo(11, first, deleted, passage)).toBe(0);
  const repeated = editSession(deleted, "😀abcdefghij", passage, 3, null);
  expect(advanceCombo(0, deleted, repeated, passage)).toBe(0);
  expect(repeated.xpEarned).toBe(11);
  const mixed = editSession(repeated, "😀abcdefghij #lmn", passage, 4, null);
  expect(advanceCombo(0, repeated, mixed, passage)).toBe(3);
  const rejected = editSession(mixed, "replaced", passage, 5, null);
  expect(advanceCombo(3, mixed, rejected, passage)).toBe(3);
  expect(getCombo(9).tier).toBe(0);
  expect(getCombo(25).tier).toBe(1);
  expect(getCombo(50).tier).toBe(1);
  expect(getCombo(100).tier).toBe(2);
  expect(getCombo(200).tier).toBe(4);
  expect(getCombo(30).pitch).toBeGreaterThan(getCombo(10).pitch);
  expect(getCombo(100).pitch).toBeGreaterThan(getCombo(30).pitch);
  expect(getCombo(10000).pitch).toBeLessThanOrEqual(1.5);
  expect(getCombo(350).percent).toBe(100);
});

test("Zen combos survive retirement and retain base and bonus XP without credit replay", () => {
  let state = createZen();
  let streak = 0;
  let retired = false;
  for (let index = 0; index < 12; index++) {
    const length = [...state.session.typed].length;
    const next = editZen(
      state,
      state.session.typed + state.passage.slice(length, length + 80),
      index + 1,
    );
    streak = advanceCombo(streak, state.session, next.session, next.passage);
    if (next.session.typed.length < state.session.typed.length) retired = true;
    state = next;
  }
  expect(retired).toBe(true);
  expect(streak).toBe(960);
  expect(state.session.baseXp).toBe(960);
  expect(state.session.xpEarned).toBe(2524);
});

test("native spacing/stat-size/graphics sliders preserve typing and persist in both modes", async ({
  page,
}) => {
  await clock(page);
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.pressSequentially("slow");
  await page.keyboard.press("F2");
  await page.getByRole("slider", { name: "Character spacing" }).press("End");
  await page
    .getByRole("slider", { name: "WPM size", exact: true })
    .press("End");
  await page
    .getByRole("slider", { name: "Accuracy size", exact: true })
    .press("Home");
  await page.getByRole("switch", { name: "Live WPM", exact: true }).check();
  await page
    .getByRole("switch", { name: "Live accuracy", exact: true })
    .check();
  await setGraphicsQuality(page, "high");
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("slow");
  await expect(input).toBeFocused();
  await expect(page.locator(".passage")).toHaveCSS("letter-spacing", "3px");
  await expect(input).toHaveCSS("letter-spacing", "3px");
  const stats = page.locator(".live-stats div");
  await expect(stats.nth(0)).toHaveCSS("font-size", "28px");
  await expect(stats.nth(1)).toHaveCSS("font-size", "11.2px");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await input.pressSequentially("there");
  await page.keyboard.press("F2");
  await page.getByRole("slider", { name: "Character spacing" }).press("Home");
  await page
    .getByRole("slider", { name: "Character spacing" })
    .press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("there");
  await expect(page.locator(".passage")).toHaveCSS("letter-spacing", "0.5px");
  await page.reload();
  await expect(input).toBeFocused();
  await page.keyboard.press("F2");
  for (const [name, value] of [
    ["Character spacing", "0.5"],
    ["WPM size", "200"],
    ["Accuracy size", "80"],
  ])
    await expect(page.getByRole("slider", { name, exact: true })).toHaveValue(
      value,
    );
  await expect(
    page.getByRole("slider", { name: "Graphics quality" }),
  ).toHaveAttribute("aria-valuetext", "High");
});

test("correct-typing combo raises live sound pitch, breaks on errors/backspace, and Tab keeps earned XP", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const rates: number[] = [];
    (window as typeof window & { soundRates: number[] }).soundRates = rates;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      rates.push(this.playbackRate.value);
      return Reflect.apply(start, this, args);
    };
  });
  await clock(page);
  await page.goto("/");
  await expect(page.getByRole("textbox")).toBeFocused();
  await page.keyboard.press("F2");
  await page
    .getByRole("combobox", { name: "Typing sound", exact: true })
    .selectOption("bitcrush");
  await page.getByRole("button", { name: "Preview sound" }).click();
  const rates = () =>
    page.evaluate(
      () => (window as typeof window & { soundRates: number[] }).soundRates,
    );
  await expect.poll(async () => (await rates()).length).toBe(1);
  await page.keyboard.press("Escape");
  const input = page.getByRole("textbox");
  const passage = await page.locator(".passage").innerText();
  await input.pressSequentially(passage.slice(0, 60));
  await expect(
    page.getByRole("meter", { name: "Typing combo" }),
  ).toHaveAttribute("aria-valuenow", "60");
  await expect(page.locator(".combo-meter")).toHaveAttribute("data-tier", "2");
  const values = await rates();
  expect(values[1]).toBe(1);
  expect(values[values.length - 1]).toBeGreaterThan(values[21]);
  expect(Math.max(...values)).toBeLessThanOrEqual(1.5);
  await input.press("#");
  await expect(page.getByRole("meter")).toHaveCount(0);
  expect((await rates()).at(-1)).toBe(1);
  await input.press("Tab");
  // Per-key pitch growth is covered above; one native edit is enough for reset/deletion checks.
  await input.fill(passage.slice(0, 50));
  await input.press("Shift+Tab");
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "50");
  await input.press("Backspace");
  await expect(page.getByRole("meter")).toHaveCount(0);
  await input.press("Tab");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("h2otype.progress.v1")!).totalXp,
    ),
  ).toBe(122);
  await input.press("s");
  expect((await rates()).at(-1)).toBe(1);
  await expect(input).toBeFocused();
});

test("Zen pause/reload clear streaks while the feedback toggle keeps reward accounting", async ({
  page,
}) => {
  await clock(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  const input = page.getByRole("textbox");
  const passage = await page.locator(".passage").innerText();
  await input.pressSequentially(passage.slice(0, 20));
  await expect(page.getByRole("meter")).toHaveCount(0);
  await input.press("Escape");
  await expect(page.getByRole("meter")).toHaveCount(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("meter")).toHaveCount(0);
  await input.pressSequentially(passage.slice(20, 40));
  await expect(page.getByRole("meter")).toHaveCount(0);
  await page.keyboard.press("F2");
  await page
    .getByRole("switch", { name: "Combo feedback", exact: true })
    .uncheck();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("meter")).toHaveCount(0);
  await input.pressSequentially(passage.slice(40, 50));
  await page.keyboard.press("F2");
  await page
    .getByRole("switch", { name: "Combo feedback", exact: true })
    .check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("meter")).toHaveCount(0);
  await input.pressSequentially(passage.slice(50, 65));
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "45");
  await page.reload();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("meter")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("h2otype.progress.v1")!).totalXp,
    ),
  ).toBe(69);
});

test("larger pixel particles use fewer sprites and remain bounded during rapid typing", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "h2otype.preferences.v1",
      JSON.stringify({ version: 1, preferences: { particleStyle: "pixel" } }),
    );
    const rectangles: number[][] = [];
    (window as typeof window & { particleRects: number[][] }).particleRects =
      rectangles;
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (...args) {
      rectangles.push([...args]);
      return Reflect.apply(fill, this, args);
    };
  });
  await clock(page);
  await page.goto("/");
  const input = page.getByRole("textbox");
  const passage = await page.locator(".passage").innerText();
  await input.press("s");
  await page.clock.runFor(34);
  const rects = () =>
    page.evaluate(
      () =>
        (window as typeof window & { particleRects: number[][] }).particleRects,
    );
  expect((await rects()).length).toBe(4);
  expect((await rects()).every((rect) => rect[2] === 6 && rect[3] === 6)).toBe(
    true,
  );
  await input.pressSequentially(passage.slice(1, 100));
  await page.evaluate(() => {
    (
      window as typeof window & { particleRects: number[][] }
    ).particleRects.length = 0;
  });
  await page.clock.runFor(34);
  expect((await rects()).length).toBeGreaterThan(0);
  expect((await rects()).length).toBeLessThanOrEqual(24);
});

test("grand level-up celebration respects notification/motion/quality settings and never intercepts typing", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "h2otype.progress.v1",
      JSON.stringify({ version: 1, totalXp: 99, zen: null }),
    ),
  );
  await clock(page);
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.press("s");
  await page.clock.runFor(600);
  await expect(page.locator(".level-up-banner")).toContainText("Level 2");
  await expect(page.locator(".level-halo")).toHaveCount(1);
  await expect(page.locator(".level-shards i")).toHaveCount(14);
  await expect(page.locator(".progress-notice")).toHaveCSS(
    "pointer-events",
    "none",
  );
  await expect(input).toBeFocused();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const banner = await page.locator(".level-up-banner").boundingBox();
    const passage = await page.locator(".passage-window").boundingBox();
    expect(banner!.x).toBeGreaterThanOrEqual(0);
    expect(banner!.x + banner!.width).toBeLessThanOrEqual(viewport.width);
    expect(banner!.y + banner!.height).toBeLessThanOrEqual(passage!.y);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".level-halo")).toHaveCount(0);
  await expect(page.locator(".level-up-banner")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.keyboard.press("F2");
  await setGraphicsQuality(page, "low");
  await expect(page.locator(".level-halo")).toHaveCount(0);
  await page
    .getByRole("switch", { name: "Level-up notifications", exact: true })
    .uncheck();
  await page.keyboard.press("Escape");
  await expect(page.locator(".level-up-banner")).toHaveCount(0);
  await expect(input).toBeFocused();
});

test("maximum spacing and statistics sizes fit phone/landscape viewports with an active combo", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "h2otype.preferences.v1",
      JSON.stringify({
        version: 1,
        preferences: {
          characterSpacing: 3,
          typingScale: 130,
          typingWeight: 700,
          liveWpm: true,
          liveAccuracy: true,
          wpmScale: 200,
          accuracyScale: 200,
        },
      }),
    ),
  );
  await clock(page);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const text = await page.locator(".passage").innerText();
    await page.getByRole("textbox").pressSequentially(text.slice(0, 60));
    await expect(page.getByRole("meter")).toHaveAttribute(
      "aria-valuenow",
      "60",
    );
    const bounds = await page.locator(".typing-space").boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    const caret = await page.locator(".character.current").boundingBox();
    const window = await page.locator(".passage-window").boundingBox();
    expect(caret!.y).toBeGreaterThanOrEqual(window!.y);
    expect(caret!.y + caret!.height).toBeLessThanOrEqual(
      window!.y + window!.height,
    );
  }
  // Keep the existing run/caret visible when a desktop viewport becomes a phone.
  await page.setViewportSize({ width: 320, height: 568 });
  await expect
    .poll(async () => {
      const caret = await page.locator(".character.current").boundingBox();
      const window = await page.locator(".passage-window").boundingBox();
      return (
        caret!.y >= window!.y &&
        caret!.y + caret!.height <= window!.y + window!.height
      );
    })
    .toBe(true);
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "60");
});
