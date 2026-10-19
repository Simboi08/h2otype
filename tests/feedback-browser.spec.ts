import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("textbox")).toBeFocused();
}
async function open(page: Page) {
  await page.keyboard.press("F2");
}
async function close(page: Page) {
  await page.keyboard.press("Escape");
}
async function hasInk(page: Page) {
  return page
    .locator(".typing-particles")
    .evaluate((element: HTMLCanvasElement) => {
      const pixels = element
        .getContext("2d")!
        .getImageData(0, 0, element.width, element.height).data;
      return pixels.some((value, index) => index % 4 === 3 && value > 0);
    });
}

async function installSoundProbe(page: Page) {
  await page.addInitScript(() => {
    const stats = {
      durations: [] as number[],
      active: new Set<AudioBufferSourceNode>(),
      maximum: 0,
    };
    (window as typeof window & { audioStats: typeof stats }).audioStats = stats;
    const start = AudioBufferSourceNode.prototype.start;
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args) {
      stats.durations.push(this.buffer!.duration);
      stats.active.add(this);
      stats.maximum = Math.max(stats.maximum, stats.active.size);
      const ended = this.onended;
      this.onended = (event) => {
        stats.active.delete(this);
        ended?.call(this, event);
      };
      return Reflect.apply(start, this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) {
      stats.active.delete(this);
      return Reflect.apply(stop, this, args);
    };
  });
}
function audioStats(page: Page) {
  return page.evaluate(() => {
    const data = (
      window as typeof window & {
        audioStats: { durations: number[]; maximum: number };
      }
    ).audioStats;
    return { durations: data.durations, maximum: data.maximum };
  });
}

test("sound is silent by default, previews each style, plays once per accepted edit, and mutes immediately", async ({
  page,
}) => {
  await installSoundProbe(page);
  const stats = () => audioStats(page);
  await ready(page);
  const input = page.getByRole("textbox");
  await input.press("s");
  expect((await stats()).durations).toHaveLength(0);
  await open(page);
  await expect(
    page.getByRole("combobox", { name: "Typing sound", exact: true }),
  ).toHaveValue("off");
  await page
    .getByRole("combobox", { name: "Typing sound", exact: true })
    .selectOption("standard");
  await page.getByRole("button", { name: "Preview sound" }).click();
  await expect.poll(async () => (await stats()).durations.length).toBe(1);
  expect((await stats()).durations[0]).toBeCloseTo(0.035, 3);
  await close(page);
  await input.press("l");
  await expect.poll(async () => (await stats()).durations.length).toBe(2);
  await input.press("Backspace");
  expect((await stats()).durations).toHaveLength(2);
  await input.press("l");
  await expect.poll(async () => (await stats()).durations.length).toBe(3);
  await open(page);
  await page
    .getByRole("combobox", { name: "Typing sound", exact: true })
    .selectOption("bitcrush");
  await page.getByRole("button", { name: "Preview sound" }).click();
  await expect.poll(async () => (await stats()).durations.length).toBe(4);
  expect((await stats()).durations[3]).toBeCloseTo(0.055, 3);
  await page.getByRole("slider", { name: "Sound volume" }).press("Home");
  await expect(
    page.getByRole("button", { name: "Preview sound" }),
  ).toBeDisabled();
  await close(page);
  await input.press("o");
  expect((await stats()).durations).toHaveLength(4);
  expect((await stats()).maximum).toBeLessThanOrEqual(4);
  await page.reload();
  await expect(input).toBeFocused();
  await open(page);
  await expect(
    page.getByRole("combobox", { name: "Typing sound", exact: true }),
  ).toHaveValue("bitcrush");
  await expect(page.getByRole("slider", { name: "Sound volume" })).toHaveValue(
    "0",
  );
});

test("rapid Zen edits keep at most four sound voices without queued notes", async ({
  page,
}) => {
  await installSoundProbe(page);
  await ready(page);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await open(page);
  await page
    .getByRole("combobox", { name: "Typing sound", exact: true })
    .selectOption("bitcrush");
  await page.getByRole("button", { name: "Preview sound" }).click();
  await expect
    .poll(async () => (await audioStats(page)).durations.length)
    .toBe(1);
  await close(page);
  await page.getByRole("textbox").evaluate((element) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    for (let index = 0; index < 100; index++) {
      setter.call(element, (element as HTMLInputElement).value + "x");
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          data: "x",
          inputType: "insertText",
        }),
      );
    }
  });
  await expect
    .poll(async () => (await audioStats(page)).durations.length)
    .toBe(101);
  expect((await audioStats(page)).maximum).toBe(4);
});

test("unsupported audio reports a preference status while typing and XP keep working", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", { value: undefined });
    Object.defineProperty(window, "webkitAudioContext", { value: undefined });
  });
  await ready(page);
  await open(page);
  await page
    .getByRole("combobox", { name: "Typing sound", exact: true })
    .selectOption("standard");
  await page.getByRole("button", { name: "Preview sound" }).click();
  await expect(
    page.getByText("Sound is unavailable in this browser. Typing still works."),
  ).toBeVisible();
  await close(page);
  await page.keyboard.type("slow");
  await expect(page.getByRole("textbox")).toHaveValue("slow");
  await expect(page.locator(".character.correct")).toHaveCount(4);
});

test("regular and pixel particles emit only on correct edits, clear on restart, and respect reduced motion", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T12:01:00Z"));
  await ready(page);
  await expect(page.locator(".typing-particles")).toHaveCount(0);
  const input = page.getByRole("textbox");
  for (const style of ["regular", "pixel"]) {
    await open(page);
    await page
      .getByRole("combobox", { name: "Typing particles", exact: true })
      .selectOption(style);
    await close(page);
    await expect(page.locator(".typing-particles")).toBeAttached();
    expect(await hasInk(page)).toBe(false);
    await input.press("s");
    await page.clock.runFor(32);
    expect(await hasInk(page)).toBe(true);
    await page.clock.runFor(500);
    expect(await hasInk(page)).toBe(false);
    await input.press("x");
    await page.clock.runFor(32);
    expect(await hasInk(page)).toBe(false);
    await input.press("Backspace");
    await input.press("l");
    await page.clock.runFor(32);
    expect(await hasInk(page)).toBe(true);
    await input.press("Tab");
    expect(await hasInk(page)).toBe(false);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".typing-particles")).toHaveCount(0);
  await input.press("s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".typing-particles")).toBeAttached();
  expect(await hasInk(page)).toBe(false);
});

test("Zen pauses remove particles and resume/reload never replay an old burst", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T12:01:00Z"));
  await ready(page);
  await open(page);
  await page
    .getByRole("combobox", { name: "Typing particles", exact: true })
    .selectOption("pixel");
  await close(page);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.keyboard.type("t");
  await page.clock.runFor(32);
  expect(await hasInk(page)).toBe(true);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".typing-particles")).toHaveCount(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.locator(".typing-particles")).toBeAttached();
  expect(await hasInk(page)).toBe(false);
  await page.reload();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zen paused" })).toBeVisible();
  await expect(page.locator(".typing-particles")).toHaveCount(0);
});
