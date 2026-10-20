import { test, expect } from "@playwright/test";
import {
  defaultPreferences,
  parsePreferences,
  preferencesKey,
} from "../src/preferences";
import { graphicsProfiles } from "../src/graphics";

async function freeze(page: import("@playwright/test").Page) {
  await page.clock.install({ time: new Date("2026-10-20T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-20T12:01:00Z"));
  await page.goto("/");
  await expect(page.getByRole("textbox")).toBeFocused();
  await page.evaluate(() => document.fonts.ready);
}

async function lineStarts(page: import("@playwright/test").Page) {
  return page.locator(".passage").evaluate((p) => {
    const starts: number[] = [];
    let previous = -Infinity;
    [...p.querySelectorAll(".character")].forEach((span, index) => {
      const top = Math.round(span.getBoundingClientRect().top);
      if (top > previous + 2) {
        starts.push(index);
        previous = top;
      }
    });
    return starts;
  });
}

test("new defaults are energetic and legacy users keep every saved preference", () => {
  expect(defaultPreferences).toMatchObject({
    graphicsTier: "high",
    screenShake: true,
    soundStyle: "bitcrush",
    particleStyle: "pixel",
    typingFont: "pixel",
    confettiAmount: 150,
  });
  const old = {
    graphicsTier: "low",
    screenShake: false,
    soundStyle: "off",
    particleStyle: "off",
    typingFont: "serif",
    effectIntensity: 0,
    soundVolume: 15,
  };
  expect(
    parsePreferences(JSON.stringify({ version: 1, preferences: old })),
  ).toMatchObject(old);
  for (const invalid of [
    { scrollDuration: -1, caretDuration: 999, confettiAmount: 250 },
    { scrollDuration: 1, caretDuration: 1, confettiAmount: 1 },
  ])
    expect(
      parsePreferences(JSON.stringify({ version: 1, preferences: invalid })),
    ).toEqual(defaultPreferences);
  expect(graphicsProfiles.low.fps).toBe(30);
  expect(graphicsProfiles.medium.fps).toBe(0);
  expect(graphicsProfiles.high.fps).toBe(0);
});

test("fresh visit starts Sprint 15s with matching pixel fonts and new-player feedback", async ({
  page,
}) => {
  await freeze(page);
  await expect(
    page.getByRole("button", { name: "15s", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("timer")).toHaveText("15s remaining");
  await expect(page.locator("html")).toHaveAttribute("data-graphics", "high");
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    page.getByRole("combobox", { name: "Typing sound", exact: true }),
  ).toHaveValue("bitcrush");
  await expect(
    page.getByRole("combobox", { name: "Typing particles", exact: true }),
  ).toHaveValue("pixel");
  await expect(
    page.getByRole("switch", { name: "Screen shake", exact: true }),
  ).toBeChecked();
  const fonts = await page
    .locator(
      ".settings-note, .preference-description, .preference-select, .preference-label",
    )
    .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).fontFamily));
  expect(fonts.every((font) => font.includes("Silkscreen"))).toBe(true);
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.locator(".passage")).toHaveCSS(
    "font-family",
    'Silkscreen, "Courier New", monospace',
  );
  await page.getByRole("textbox").press("a");
  await page.clock.fastForward(15000);
  await expect(
    page.getByRole("heading", { name: "Sprint results" }),
  ).toBeFocused();
  await expect(page.locator(".finish-confetti i")).toHaveCount(240);
  expect(
    await page
      .locator(".results-context")
      .evaluate((n) => getComputedStyle(n).fontFamily),
  ).toContain("Silkscreen");
});

test("completed lines scroll immediately to the top, exposing four fresh lines before the bottom", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await freeze(page);
  const starts = await lineStarts(page);
  const text = (await page.locator(".passage").textContent())!;
  await page.getByRole("textbox").fill(text.slice(0, starts[1]));
  await page.clock.runFor(160);
  const geometry = await page.locator(".passage-window").evaluate((window) => {
    const bounds = window.getBoundingClientRect();
    const active = window.querySelector(".current")!.getBoundingClientRect();
    const lineHeight = Number.parseFloat(
      getComputedStyle(window.querySelector(".passage")!).lineHeight,
    );
    return {
      top: active.top - bounds.top,
      scroll: window.scrollTop,
      lineHeight,
      height: bounds.height,
    };
  });
  expect(geometry.scroll).toBeGreaterThan(geometry.lineHeight - 2);
  expect(geometry.top).toBeLessThan(geometry.lineHeight);
  expect(geometry.height).toBeGreaterThanOrEqual(geometry.lineHeight * 4);
  await page.getByRole("textbox").press("Tab");
  await expect
    .poll(() => page.locator(".passage-window").evaluate((n) => n.scrollTop))
    .toBe(0);
});

test("scroll/caret speeds and confetti apply, persist and keep existing progress", async ({
  page,
}) => {
  await freeze(page);
  const input = page.getByRole("textbox");
  const text = (await page.locator(".passage").textContent())!;
  await input.press(text[0]);
  await page.getByRole("button", { name: "Open settings" }).click();
  await page
    .getByRole("slider", { name: "Scroll speed", exact: true })
    .press("End");
  await page
    .getByRole("slider", { name: "Caret speed", exact: true })
    .press("End");
  await page
    .getByRole("slider", { name: "Finish confetti", exact: true })
    .press("Home");
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(input).toHaveValue(text[0]);
  await input.press(text[1]);
  await expect(page.locator(".typing-caret")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await page.clock.fastForward(15000);
  await expect(
    page.getByRole("heading", { name: "Sprint results" }),
  ).toBeFocused();
  await expect(page.locator(".finish-confetti i")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Open settings" }).click();
  for (const label of ["Scroll speed", "Caret speed"])
    await expect(
      page.getByRole("slider", { name: label, exact: true }),
    ).toHaveAttribute("aria-valuetext", "Instant");
  await expect(
    page.getByRole("slider", { name: "Finish confetti", exact: true }),
  ).toHaveValue("0");
});

test("saved mute/low graphics remain and reduced motion forces instant line/caret movement", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, preferences }) =>
      localStorage.setItem(key, JSON.stringify({ version: 1, preferences })),
    {
      key: preferencesKey,
      preferences: {
        graphicsTier: "low",
        screenShake: false,
        soundStyle: "off",
        particleStyle: "off",
        typingFont: "mono",
      },
    },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await freeze(page);
  const starts = await lineStarts(page);
  const text = (await page.locator(".passage").textContent())!;
  await page.getByRole("textbox").fill(text.slice(0, starts[2]));
  expect(
    await page.locator(".passage-window").evaluate((n) => n.scrollTop),
  ).toBeGreaterThan(0);
  await expect(page.locator(".typing-caret")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await expect(page.locator(".typing-particles")).toHaveCount(0);
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    page.getByRole("combobox", { name: "Typing sound", exact: true }),
  ).toHaveValue("off");
  await expect(
    page.getByRole("slider", { name: "Graphics quality", exact: true }),
  ).toHaveAttribute("aria-valuetext", "Low");
});

test("Daily is now a fixed shared 15-second Sprint with separate rules-version rankings", async ({
  page,
}) => {
  await freeze(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("15s remaining");
  const text = (await page.locator(".passage").textContent())!;
  await page.getByRole("textbox").fill(text.slice(0, 100));
  await page.clock.fastForward(15000);
  await expect(
    page.getByRole("heading", { name: "Daily results" }),
  ).toBeFocused();
  await expect(page.getByTestId("daily-score")).toHaveText("1,275");
  await expect(page.getByTestId("result-wpm")).toHaveText("80");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("h2otype.daily-scores.v5")!).records[0]
          .score,
    ),
  ).toBe(1275);
  await page.keyboard.press("Tab");
  expect(await page.locator(".passage").textContent()).toBe(text);
});

test("line scrolling eases promptly while High particles draw every available frame", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const probe = { clears: 0, fractional: false };
    (window as typeof window & { particleProbe: typeof probe }).particleProbe =
      probe;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains("typing-particles")) probe.clears++;
      return clear.apply(this, args);
    };
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (...args) {
      if (
        this.canvas.classList.contains("typing-particles") &&
        args[0] % 1 !== 0
      )
        probe.fractional = true;
      return fill.apply(this, args);
    };
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await freeze(page);
  const starts = await lineStarts(page);
  const text = (await page.locator(".passage").textContent())!;
  const before = await page.evaluate(
    () =>
      (window as typeof window & { particleProbe: { clears: number } })
        .particleProbe.clears,
  );
  await page.getByRole("textbox").fill(text.slice(0, starts[1]));
  const at = () => page.locator(".passage-window").evaluate((n) => n.scrollTop);
  const start = await at();
  await page.clock.runFor(64);
  const middle = await at();
  await page.clock.runFor(96);
  const end = await at();
  expect(start).toBe(0);
  expect(middle).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(middle);
  const probe = await page.evaluate(
    () =>
      (
        window as typeof window & {
          particleProbe: { clears: number; fractional: boolean };
        }
      ).particleProbe,
  );
  expect(probe.clears - before).toBeGreaterThanOrEqual(9);
  expect(probe.fractional).toBe(true);
  await page.getByRole("textbox").press(text[starts[1]]);
  await expect(page.locator(".typing-caret")).toHaveCSS(
    "transition-duration",
    "0.07s",
  );
});
