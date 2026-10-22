import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { comboSparkProfile } from "../src/comboSparks";
import { setGraphicsQuality } from "./settings";

async function ready(page: Page) {
  await page.clock.install({ time: new Date("2026-10-22T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-22T12:01:00Z"));
  await page.goto("/");
  await page.getByRole("button", { name: "60s", exact: true }).click();
}
async function text(page: Page) {
  return (await page.locator(".passage").textContent())!;
}
const pixels = (page: Page) => page.locator(".combo-meter-particles i");

test("combo profiles scale particle size with stage while quality bounds sprite counts", () => {
  let previous = 0;
  for (let tier = 1; tier <= 5; tier++) {
    const profile = comboSparkProfile(tier, "high", 2);
    expect(profile.size).toBeGreaterThan(previous);
    expect(profile.count).toBeLessThanOrEqual(20);
    expect(profile.maximum).toBe(64);
    expect(comboSparkProfile(tier, "medium", 1).count).toBeLessThan(
      profile.count,
    );
    expect(comboSparkProfile(tier, "low", 2).count).toBe(0);
    expect(comboSparkProfile(tier, "high", 0).count).toBe(0);
    previous = profile.size;
  }
});

test("whole bar fills once before an upgrade burst, then resets once without remounting", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const durations: number[] = [];
    (
      window as typeof window & { barShakeDurations: number[] }
    ).barShakeDurations = durations;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (
        this.classList.contains("combo-meter") &&
        Array.isArray(frames) &&
        frames.some((frame) => typeof frame.transform === "string")
      )
        durations.push(
          Number(typeof options === "number" ? options : options?.duration),
        );
      return animate.call(this, frames, options);
    };
  });
  await ready(page);
  const passage = await text(page);
  await page.getByRole("textbox").fill(passage.slice(0, 24));
  await page.clock.runFor(100);
  const fill = await page.locator(".combo-track > span").elementHandle();
  await page.keyboard.insertText(passage[24]);
  const samples: number[] = [];
  for (let frame = 0; frame < 12; frame++) {
    await page.clock.runFor(16);
    samples.push(
      await fill!.evaluate((n) => parseFloat((n as HTMLElement).style.width)),
    );
    if (
      await page
        .locator('.combo-meter-particles i[data-kind="upgrade"]')
        .count()
    )
      expect(
        await page.locator(".combo-meter").getAttribute("data-phase"),
      ).not.toBe("complete");
  }
  expect(Math.max(...samples)).toBe(100);
  expect(
    samples.filter(
      (value, index) => index > 0 && samples[index - 1] > 90 && value < 10,
    ),
  ).toHaveLength(1);
  expect(
    await fill!.evaluate(
      (n) => n === document.querySelector(".combo-track > span"),
    ),
  ).toBe(true);
  await expect(
    page.locator('.combo-meter-particles i[data-kind="upgrade"]'),
  ).toHaveCount(12);
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { barShakeDurations: number[] })
          .barShakeDurations,
    ),
  ).toEqual([200]);
  await page.keyboard.insertText(passage.slice(25, 40));
  await page.clock.runFor(150);
  expect(
    await fill!.evaluate((n) => parseFloat((n as HTMLElement).style.width)),
  ).toBeGreaterThan(30);
  await expect(page.getByRole("textbox")).toBeFocused();
});

test("charging sparks originate at the moving fill edge, stop on idle and clear on mistakes/restart", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const points: { x: number; edge: number; kind: string }[] = [];
    (window as typeof window & { sparkPoints: typeof points }).sparkPoints =
      points;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.parentElement?.classList.contains("combo-meter-particles")) {
        const element = this as HTMLElement;
        points.push({
          x: parseFloat(element.style.left),
          edge: document
            .querySelector(".combo-track > span")!
            .getBoundingClientRect().right,
          kind: element.dataset.kind!,
        });
      }
      return animate.call(this, frames, options);
    };
  });
  await ready(page);
  const passage = await text(page);
  await page.getByRole("textbox").fill(passage.slice(0, 20));
  await page.clock.runFor(80);
  await expect(pixels(page)).not.toHaveCount(0);
  const points = await page.evaluate(
    () =>
      (
        window as typeof window & {
          sparkPoints: { x: number; edge: number; kind: string }[];
        }
      ).sparkPoints,
  );
  expect(points.length).toBeGreaterThan(0);
  expect(
    points.every(
      (point) =>
        point.kind === "charge" && Math.abs(point.x - point.edge) < 0.1,
    ),
  ).toBe(true);
  await page.clock.runFor(500);
  await expect(pixels(page)).toHaveCount(0);
  await page.keyboard.insertText(passage[20]);
  await page.clock.runFor(32);
  await expect(pixels(page)).not.toHaveCount(0);
  await page.keyboard.insertText("#");
  await expect(pixels(page)).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.locator(".combo-meter-particles")).toHaveCount(0);
});

test("all five upgrades complete the bar and emit progressively larger local and edge pixels", async ({
  page,
}) => {
  await ready(page);
  let lastSize = 0;
  for (const [index, threshold] of [25, 60, 120, 200, 350].entries()) {
    await page.keyboard.press("Tab");
    await page
      .getByRole("textbox")
      .fill((await text(page)).slice(0, threshold));
    await page.clock.runFor(80);
    expect(
      await page
        .locator(".combo-track > span")
        .evaluate((n) => parseFloat((n as HTMLElement).style.width)),
    ).toBe(100);
    const burst = page.locator('.combo-meter-particles i[data-kind="upgrade"]');
    await expect(burst).toHaveCount(12 + index * 2);
    const minimum = Math.min(
      ...(await burst.evaluateAll((nodes) =>
        nodes.map((n) => parseFloat((n as HTMLElement).style.width)),
      )),
    );
    expect(minimum).toBeGreaterThan(lastSize);
    lastSize = minimum;
    const edges = await page
      .locator(".combo-edge-particles i")
      .evaluateAll((nodes) =>
        nodes.map((n) => parseFloat((n as HTMLElement).style.width)),
      );
    expect(Math.min(...edges)).toBeGreaterThanOrEqual(6.5 + index * 1.5);
    expect(await pixels(page).count()).toBeLessThanOrEqual(64);
    await page.clock.runFor(900);
    await expect(pixels(page)).toHaveCount(0);
  }
});

test("effects, shake and motion controls cancel immediately without replaying a milestone", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("textbox").fill((await text(page)).slice(0, 30));
  await page.clock.runFor(80);
  await expect(pixels(page)).not.toHaveCount(0);
  await page.keyboard.press("F2");
  await page
    .getByRole("switch", { name: "Screen shake", exact: true })
    .uncheck();
  await page.keyboard.press("Escape");
  expect(
    await page
      .locator(".combo-meter")
      .evaluate((n) => n.getAnimations().length),
  ).toBe(0);
  await page.clock.runFor(300);
  await expect(pixels(page)).toHaveCount(0);
  await page.keyboard.insertText((await text(page)).slice(30, 80));
  await page.clock.runFor(80);
  await expect(
    page.locator('.combo-meter-particles i[data-kind="upgrade"]'),
  ).toHaveCount(14);
  expect(
    await page
      .locator(".combo-meter")
      .evaluate((n) =>
        n
          .getAnimations()
          .some(
            (animation) =>
              animation.effect instanceof KeyframeEffect &&
              animation.effect
                .getKeyframes()
                .some((frame) => typeof frame.transform === "string"),
          ),
      ),
  ).toBe(false);
  await page.keyboard.press("F2");
  await setGraphicsQuality(page, "low");
  await page.keyboard.press("Escape");
  await expect(page.locator(".combo-meter-particles")).toHaveCount(0);
  await page.keyboard.press("F2");
  await setGraphicsQuality(page, "high");
  await page.keyboard.press("Escape");
  await page.clock.runFor(300);
  await expect(pixels(page)).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".combo-meter-particles")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.runFor(300);
  await expect(pixels(page)).toHaveCount(0);
});

test("resize and hide cancel in-flight charging and upgrades without replay", async ({
  page,
}) => {
  await ready(page);
  const passage = await text(page);
  await page.getByRole("textbox").fill(passage.slice(0, 30));
  await page.clock.runFor(32); // cancel before the pending full-bar burst
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.runFor(300);
  await expect(pixels(page)).toHaveCount(0);
  await expect(page.locator(".combo-meter")).toHaveAttribute(
    "data-phase",
    "track",
  );
  await page.keyboard.insertText(passage.slice(30, 80));
  await page.clock.runFor(80);
  await expect(pixels(page)).not.toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(pixels(page)).toHaveCount(0);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(300);
  await expect(pixels(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("textbox").fill((await text(page)).slice(0, 30));
  await page.clock.runFor(80);
  await expect(pixels(page)).not.toHaveCount(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".combo-meter-particles")).toHaveCount(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(300);
  await expect(pixels(page)).toHaveCount(0);
});
