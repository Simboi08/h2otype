import { expect, test } from "./practice-fixture";
import type { Page } from "@playwright/test";
import { defaultPreferences, parsePreferences } from "../src/preferences";
import { comboImpact, impactProfile } from "../src/combo";
import { setGraphicsQuality } from "./settings";

async function ready(page: Page) {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T12:01:00Z"));
  await page.goto("/");
  await page.getByRole("button", { name: "30s", exact: true }).click();
  await expect(page.getByRole("textbox")).toBeFocused();
}
async function probeShake(page: Page) {
  await page.addInitScript(() => {
    const impacts: { frames: Keyframe[]; duration: number }[] = [];
    (window as typeof window & { impacts: typeof impacts }).impacts = impacts;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.classList.contains("practice-surface"))
        impacts.push({
          frames: frames as Keyframe[],
          duration:
            typeof options === "number" ? options : Number(options?.duration),
        });
      return animate.call(this, frames, options);
    };
  });
}
const impacts = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as typeof window & {
          impacts: { frames: Keyframe[]; duration: number }[];
        }
      ).impacts,
  );

test("effects default to Intense with shake on while saved choices and invalid fields migrate safely", () => {
  const parse = (preferences: Record<string, unknown>) =>
    parsePreferences(JSON.stringify({ version: 1, preferences }));
  expect(defaultPreferences.effectIntensity).toBe(2);
  expect(defaultPreferences.screenShake).toBe(true);
  expect(
    parse({ graphicsTier: "low", particleStyle: "off", soundVolume: 20 }),
  ).toEqual({
    ...defaultPreferences,
    graphicsTier: "low",
    particleStyle: "off",
    soundVolume: 20,
  });
  expect(parse({ effectIntensity: 0, screenShake: false })).toEqual({
    ...defaultPreferences,
    effectIntensity: 0,
    screenShake: false,
  });
  expect(parse({ effectIntensity: 1 })).toEqual({
    ...defaultPreferences,
    effectIntensity: 1,
  });
  for (const effectIntensity of [-1, 0.5, 3, "2", null])
    expect(parse({ effectIntensity, screenShake: "yes" })).toEqual(
      defaultPreferences,
    );
});

test("combo impacts reward tier changes and longer streak milestones instead of every keystroke", () => {
  expect(comboImpact(9, 10)).toBe(0);
  expect(comboImpact(10, 11)).toBe(0);
  expect(comboImpact(24, 25)).toBe(1);
  expect(comboImpact(49, 50)).toBe(0);
  expect(comboImpact(59, 60)).toBe(2);
  expect(comboImpact(60, 61)).toBe(0);
  expect(comboImpact(69, 70)).toBe(0);
  expect(impactProfile(2, 5)).toEqual({
    strength: 7.5,
    duration: 220,
    cooldown: 120,
  });
  expect(impactProfile(1, 5)).toEqual({
    strength: 0.8,
    duration: 160,
    cooldown: 250,
  });
  expect(comboImpact(199, 200)).toBe(4);
  expect(comboImpact(220, 0)).toBe(0);
  expect(comboImpact(220, 220)).toBe(0);
});

test("level-up scales in, holds, and scales out over equal short intervals before its notice is removed", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "h2otype.progress.v1",
      JSON.stringify({ version: 1, totalXp: 99, zen: null }),
    ),
  );
  await ready(page);
  await page.getByRole("textbox").press("s");
  const banner = page.locator(".level-up-banner");
  await expect(banner).toHaveCSS("animation-name", "grand-cycle");
  const at = (time: number) =>
    banner.evaluate((element, time) => {
      const animation = element
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName === "grand-cycle",
        )!;
      animation.pause();
      animation.currentTime = time;
      return {
        scale: new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
        duration: animation.effect!.getTiming().duration,
      };
    }, time);
  const start = await at(0);
  const entering = await at(80);
  const full = await at(320);
  const holding = await at(3680);
  const leaving = await at(3920);
  const end = await at(3999);
  expect(start.duration).toBe(4000);
  expect(start.scale).toBeLessThan(0.1);
  expect(entering.scale).toBeGreaterThan(start.scale);
  expect(full.scale).toBeCloseTo(1);
  expect(holding.scale).toBeCloseTo(full.scale);
  expect(leaving.scale).toBeCloseTo(entering.scale, 3);
  expect(end.scale).toBeLessThan(leaving.scale);
  expect(end.scale).toBeLessThan(0.1);
  await expect(page.getByRole("textbox")).toBeFocused();
  await page.clock.fastForward(4000);
  await expect(banner).toHaveCount(0);
});

test("default combos add an edge vignette and stronger bounded shake without flame sprites or filters", async ({
  page,
}) => {
  await probeShake(page);
  await ready(page);
  const input = page.getByRole("textbox");
  const passage = await page.locator(".passage").innerText();
  await input.fill(passage.slice(0, 25));
  await expect(page.locator("html")).toHaveAttribute("data-effects", "2");
  await expect(page.locator(".screen-lines")).toHaveCount(0);
  const vignette = page.locator(".combo-vignette");
  await expect(vignette).toHaveCSS("pointer-events", "none");
  await expect(vignette).toHaveAttribute("data-tier", "1");
  await expect(
    page.locator(".fire-jet, .combo-flames, .combo-embers"),
  ).toHaveCount(0);
  expect(
    await vignette.evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain("radial-gradient");
  const bounds = await vignette.boundingBox();
  expect(bounds!.width).toBe(1280);
  expect(bounds!.height).toBe(720);
  const first = await impacts(page);
  expect(first).toHaveLength(1);
  expect(first[0].duration).toBe(220);
  expect(
    first[0].frames.some((frame) => frame.transform !== "translate(0, 0)"),
  ).toBe(true);
  expect(
    first[0].frames.every((frame) =>
      [...String(frame.transform).matchAll(/(-?[\d.]+)px/g)].every(
        (value) => Math.abs(Number(value[1])) <= 8,
      ),
    ),
  ).toBe(true);
  await input.press(passage[25]);
  expect(await impacts(page)).toHaveLength(1);
  await page.clock.runFor(300);
  await input.pressSequentially(passage.slice(26, 60));
  expect(await impacts(page)).toHaveLength(2);
  await input.press("Tab");
  await expect(page.locator(".combo-vignette")).toHaveCount(0);
  expect(
    await page
      .locator(".practice-surface")
      .evaluate((element) => element.getAnimations().length),
  ).toBe(0);
  await expect(input).toBeFocused();
});

test("visual intensity and shake controls apply immediately, preserve a combo, and persist through reload", async ({
  page,
}) => {
  await probeShake(page);
  await ready(page);
  const input = page.getByRole("textbox");
  const passage = await page.locator(".passage").innerText();
  await input.fill(passage.slice(0, 60));
  await page.clock.runFor(300);
  const intenseOpacity = await page
    .locator(".combo-vignette")
    .evaluate((el) => Number(getComputedStyle(el).opacity));
  const chargeBeforePreferences = await page
    .getByRole("meter")
    .getAttribute("aria-valuenow");
  await page.keyboard.press("F2");
  await page.getByRole("slider", { name: "Visual effects" }).press("Home");
  await page
    .getByRole("slider", { name: "Visual effects" })
    .press("ArrowRight");
  await page
    .getByRole("switch", { name: "Screen shake", exact: true })
    .uncheck();
  await page
    .getByRole("combobox", { name: "Typing particles", exact: true })
    .selectOption("pixel");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("meter")).toHaveAttribute(
    "aria-valuenow",
    chargeBeforePreferences!,
  );
  await page.clock.runFor(300);
  expect(
    await page
      .locator(".combo-vignette")
      .evaluate((el) => Number(getComputedStyle(el).opacity)),
  ).toBeLessThan(intenseOpacity);
  const count = (await impacts(page)).length;
  await input.pressSequentially(passage.slice(60, 80));
  expect(await impacts(page)).toHaveLength(count);
  await page.keyboard.press("F2");
  await page.getByRole("slider", { name: "Visual effects" }).press("Home");
  await page.keyboard.press("Escape");
  await expect(page.locator(".combo-vignette")).toHaveCount(0);
  await expect(page.locator(".combo-flames")).not.toBeVisible();
  await expect(page.locator(".typing-particles")).toHaveCount(0);
  expect(
    await page
      .locator(".practice-surface")
      .evaluate((element) => element.getAnimations().length),
  ).toBe(0);
  await input.pressSequentially(passage.slice(80, 100));
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "98");
  await expect(page.locator(".level-up-banner")).toContainText("Level 2");
  await expect(page.locator(".level-up-banner")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".level-halo")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("h2otype.progress.v1")!).totalXp,
    ),
  ).toBe(127);
  await page.reload();
  await expect(input).toBeFocused();
  await page.keyboard.press("F2");
  await expect(
    page.getByRole("slider", { name: "Visual effects" }),
  ).toHaveAttribute("aria-valuetext", "Off");
  await expect(
    page.getByRole("switch", { name: "Screen shake", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("combobox", { name: "Typing particles", exact: true }),
  ).toHaveValue("pixel");
});

test("reduced motion and Low quality suppress screen shake and vignette motion even when effects are Intense", async ({
  page,
}) => {
  await probeShake(page);
  await ready(page);
  for (const mode of ["reduced", "low"]) {
    await page.emulateMedia({
      reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
    });
    if (mode === "low") {
      await page.keyboard.press("F2");
      await setGraphicsQuality(page, "low");
      await page.keyboard.press("Escape");
    }
    await page.getByRole("textbox").press("Tab");
    const passage = await page.locator(".passage").innerText();
    await page.getByRole("textbox").fill(passage.slice(0, 100));
    await expect(page.getByRole("meter")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(await impacts(page)).toHaveLength(0);
    await expect(page.locator(".combo-vignette")).toHaveCSS(
      "animation-name",
      "none",
    );
    await expect(page.locator(".combo-embers")).not.toBeVisible();
    await expect(page.locator(".level-up-banner")).toHaveCSS(
      "animation-name",
      "none",
    );
    await expect(page.locator(".level-halo")).toHaveCount(0);
  }
});

test("Sprint switches immediately from paused and finished Zen without clearing its saved session", async ({
  page,
}) => {
  await ready(page);
  for (const action of ["Pause", "Finish"]) {
    await page.getByRole("button", { name: "Zen", exact: true }).click();
    if (
      await page
        .getByRole("button", { name: "New session", exact: true })
        .count()
    )
      await page
        .getByRole("button", { name: "New session", exact: true })
        .click();
    await page.getByRole("textbox").pressSequentially("there");
    await page.clock.runFor(3000);
    await page.getByRole("button", { name: action, exact: true }).click();
    await page.getByRole("button", { name: "Sprint", exact: true }).click();
    await expect(page.getByRole("timer")).toHaveText("30s remaining");
    await expect(page.getByRole("textbox")).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Go to Sprint", exact: true }),
    ).toHaveCount(0);
    await page.clock.runFor(5000);
    await page.getByRole("button", { name: "Zen", exact: true }).click();
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByRole("textbox")).toHaveValue("there");
    await expect(page.getByRole("timer")).toHaveText("3s elapsed");
    await page.getByRole("button", { name: "Sprint", exact: true }).click();
  }
});

test("direct mode switches retain Zen progress in memory when browser storage cannot save", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Quota exceeded");
    };
  });
  await ready(page);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("textbox").pressSequentially("there");
  await page.clock.runFor(3000);
  await page.getByRole("button", { name: "Sprint", exact: true }).click();
  await expect(page.getByRole("textbox")).toBeFocused();
  await expect(page.getByRole("timer")).toHaveText("30s remaining");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("there");
  await expect(page.getByRole("timer")).toHaveText("3s elapsed");
  await expect(page.locator(".progress-unsaved")).toContainText("XP not saved");
});
