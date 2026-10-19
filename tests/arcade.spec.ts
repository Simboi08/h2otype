import { expect, test, sentenceStorage } from "./practice-fixture";
import type { Page } from "@playwright/test";
import { easeXp, graphicsProfiles, particleVelocity } from "../src/graphics";
import { defaultPreferences, parsePreferences } from "../src/preferences";
import { createSoundSamples } from "../src/typingSound";
import { setGraphicsQuality } from "./settings";

async function clock(page: Page) {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T12:01:00Z"));
}
const scale = (page: Page) =>
  page
    .locator(".xp-fill")
    .evaluate(
      (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
    );

test("graphics tiers validate independently and assign increasing bounded budgets", () => {
  for (const graphicsTier of ["low", "medium", "high"] as const) {
    expect(
      parsePreferences(
        JSON.stringify({ version: 1, preferences: { graphicsTier } }),
      ).graphicsTier,
    ).toBe(graphicsTier);
    const profile = graphicsProfiles[graphicsTier];
    expect(profile.maximum).toBeLessThanOrEqual(144);
    expect(profile.fps).toBeLessThanOrEqual(60);
    for (let angle = 0; angle <= 1; angle += 0.01)
      expect(
        particleVelocity(angle, 0.5, graphicsTier).vx,
      ).toBeGreaterThanOrEqual(0);
  }
  expect(graphicsProfiles.low.burst).toBeLessThan(
    graphicsProfiles.medium.burst,
  );
  expect(graphicsProfiles.medium.burst).toBeLessThan(
    graphicsProfiles.high.burst,
  );
  expect(particleVelocity(0, 0.5, "medium").vy).toBeLessThan(0);
  expect(particleVelocity(1, 0.5, "medium").vy).toBeGreaterThan(0);
  expect(particleVelocity(0.5, 0.5, "medium").vy).toBe(0);
  expect(
    parsePreferences(
      JSON.stringify({
        version: 1,
        preferences: { graphicsTier: "ultra", liveWpm: true },
      }),
    ),
  ).toEqual({ ...defaultPreferences, liveWpm: true });
});

test("XP easing accelerates then decelerates with exact endpoints", () => {
  expect(easeXp(0)).toBe(0);
  expect(easeXp(0.5)).toBe(0.5);
  expect(easeXp(1)).toBe(1);
  expect(easeXp(0.4) - easeXp(0.3)).toBeGreaterThan(easeXp(0.1) - easeXp(0));
  expect(easeXp(1) - easeXp(0.9)).toBeLessThan(easeXp(0.7) - easeXp(0.6));
});

test("8-bit crunch has a stronger body than Standard with safe signal headroom", () => {
  const rms = (samples: Float32Array) =>
    Math.sqrt(
      samples.reduce((sum, sample) => sum + sample * sample, 0) /
        samples.length,
    );
  const standard = createSoundSamples("standard", 48000);
  const crunch = createSoundSamples("bitcrush", 48000);
  expect(rms(crunch)).toBeGreaterThan(rms(standard) * 1.8);
  expect(crunch.every((sample) => Math.abs(sample) < 0.9)).toBe(true);
});

test("particles start beyond the letter's right edge and graphics tiers change density and canvas resolution", async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: sentenceStorage,
    viewport: { width: 640, height: 600 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const points: number[] = [];
    (window as typeof window & { particlePoints: number[] }).particlePoints =
      points;
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (...args) {
      points.push(args[0]);
      return Reflect.apply(arc, this, args);
    };
  });
  await clock(page);
  await page.goto("/");
  const input = page.getByRole("textbox");
  await expect(input).toBeFocused();
  for (const tier of ["low", "medium", "high"] as const) {
    await page.keyboard.press("F2");
    await setGraphicsQuality(page, tier);
    await page
      .getByRole("combobox", { name: "Typing particles", exact: true })
      .selectOption("regular");
    await page.keyboard.press("Escape");
    await input.press("Tab");
    const letter = await page.locator(".character.current").boundingBox();
    // Keep the original probe array; clearing its contents retains the wrapper.
    await page.evaluate(() => {
      const probe = (window as typeof window & { particlePoints: number[] })
        .particlePoints;
      probe.length = 0;
    });
    await input.press("s");
    // Allow a complete Low-quality frame even when the first RAF is skipped.
    await page.clock.runFor(80);
    const width = await page
      .locator(".typing-particles")
      .evaluate((canvas: HTMLCanvasElement) => canvas.width);
    expect(width).toBe(Math.round(640 * graphicsProfiles[tier].resolution));
    const points = await page.evaluate(
      () =>
        (window as typeof window & { particlePoints: number[] }).particlePoints,
    );
    expect(points.length).toBeGreaterThanOrEqual(graphicsProfiles[tier].burst);
    expect(points.every((x) => x >= letter!.x + letter!.width + 1)).toBe(true);
  }
  await page.reload();
  await expect(input).toBeFocused();
  await page.keyboard.press("F2");
  await expect(
    page.getByRole("slider", { name: "Graphics quality" }),
  ).toHaveAttribute("aria-valuetext", "High");
  await context.close();
});

test("large XP rail eases toward exact XP and rolls into the next level without stealing focus", async ({
  page,
}) => {
  await clock(page);
  await page.goto("/");
  const input = page.getByRole("textbox");
  const passage = await page.locator(".passage").innerText();
  await input.fill(passage.slice(0, 50));
  const bar = page.getByRole("progressbar", { name: "Level XP" });
  await expect(bar).toHaveAttribute("aria-valuenow", "56");
  const bounds = await bar.boundingBox();
  expect(bounds!.width).toBeGreaterThan(400);
  expect(bounds!.height).toBeGreaterThanOrEqual(12);
  await page.clock.runFor(100);
  const a = await scale(page);
  await page.clock.runFor(100);
  const b = await scale(page);
  await page.clock.runFor(200);
  const c = await scale(page);
  await page.clock.runFor(100);
  const d = await scale(page);
  await page.clock.runFor(150);
  const e = await scale(page);
  expect(b - a).toBeGreaterThan(a);
  expect(e - d).toBeLessThan(d - c);
  expect(e).toBeCloseTo(0.56, 4);
  await input.press("Tab");
  await input.fill(passage.slice(0, 60));
  await expect(bar).toHaveAttribute("aria-valuenow", "25");
  await expect(bar).toHaveAttribute("aria-valuemax", "200");
  await expect(page.locator(".level-up-banner")).toContainText("Level 2");
  await expect(input).toBeFocused();
  await page.clock.runFor(900);
  expect(await scale(page)).toBeCloseTo(0.125, 4);
  await expect(page.locator(".xp-fill")).toHaveAttribute(
    "data-visual-level",
    "2",
  );
});

test("reduced motion and Low quality use exact fills and hidden XP restores correctly", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const input = page.getByRole("textbox");
  const passage = await page.locator(".passage").innerText();
  await input.fill(passage.slice(0, 50));
  expect(await scale(page)).toBeCloseTo(0.56, 4);
  await page.keyboard.press("F2");
  await page
    .getByRole("switch", { name: "XP progress", exact: true })
    .uncheck();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await page.keyboard.press("F2");
  await setGraphicsQuality(page, "low");
  await page.getByRole("switch", { name: "XP progress", exact: true }).check();
  await page.keyboard.press("Escape");
  expect(await scale(page)).toBeCloseTo(0.56, 4);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await input.press("Tab");
  await input.press("s");
  expect(await scale(page)).toBeCloseTo(0.57, 4);
  await expect(page.locator(".screen-lines")).not.toBeVisible();
});

test("arcade light and dark themes keep the XP rail and typing workspace within small viewports", async ({
  page,
}) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(page.getByRole("textbox")).toBeFocused();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true);
      await expect(page.getByRole("progressbar")).toBeInViewport();
      await expect(
        page.getByRole("button", { name: "Open settings" }),
      ).toBeInViewport();
    }
  }
});
