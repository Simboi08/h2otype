import { expect, test } from "./practice-fixture";
import type { Page } from "@playwright/test";
import { burstProfile } from "../src/screenBursts";
import { comboBonusTenths, comboThresholds, getCombo } from "../src/combo";
import { parseZen, editZen, createZen, resumeZen } from "../src/zenEngine";
import { setGraphicsQuality } from "./settings";

async function ready(page: Page) {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T12:01:00Z"));
  await page.goto("/");
  await page.getByRole("button", { name: "30s", exact: true }).click();
  await expect(page.getByRole("textbox")).toBeFocused();
}
const passage = async (page: Page) =>
  (await page.locator(".passage").textContent())!;

test("harder combo thresholds give larger bounded rewards and particles have strict quality budgets", () => {
  expect(comboThresholds).toEqual([25, 60, 120, 200, 350]);
  expect(comboBonusTenths).toEqual([0, 2, 5, 10, 15, 20]);
  expect(getCombo(24).tier).toBe(0);
  for (const [characters, multiplier] of [
    [25, 1.2],
    [60, 1.5],
    [120, 2],
    [200, 2.5],
    [350, 3],
    [10000, 3],
  ])
    expect(getCombo(characters).multiplier).toBe(multiplier);
  for (const kind of ["finish", "combo"] as const) {
    expect(burstProfile(kind, "low", 2).count).toBe(0);
    expect(burstProfile(kind, "high", 0).count).toBe(0);
    expect(burstProfile(kind, "medium", 1).count).toBeLessThan(
      burstProfile(kind, "medium", 2).count,
    );
    expect(burstProfile(kind, "medium", 2).count).toBeLessThan(
      burstProfile(kind, "high", 2).count,
    );
    expect(burstProfile(kind, "high", 2).count).toBeLessThanOrEqual(320);
  }
});

test("old reward balances remain unchanged and continue earning at the new rates", () => {
  const state = editZen(createZen(), createZen().passage.slice(0, 115), 0);
  const saved = {
    ...state,
    session: { ...state.session, baseXp: 115, bonusTenths: 279, xpEarned: 142 },
  };
  const restored = parseZen(JSON.stringify({ version: 1, state: saved }))!;
  expect(restored.session.xpEarned).toBe(142);
  expect(restored.session.streak).toBe(0);
  const active = resumeZen(restored, 1);
  const next = editZen(
    active,
    active.session.typed + active.passage.slice(115, 144),
    2,
  );
  expect(next.session.baseXp).toBe(144);
  expect(next.session.bonusTenths).toBe(289);
  expect(next.session.xpEarned).toBe(172);
});

test("finish confetti runs once, stays pointer-transparent, expires, and never replays on settings changes", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "15s", exact: true }).click();
  await page.getByRole("textbox").pressSequentially("slow");
  await page.clock.fastForward(15000);
  await expect(page.locator(".finish-confetti i")).toHaveCount(50);
  await expect(page.locator(".finish-confetti")).toHaveCSS(
    "pointer-events",
    "none",
  );
  await expect(
    page.getByRole("heading", { name: "Sprint results" }),
  ).toBeFocused();
  const geometry = await page
    .locator(".finish-confetti i")
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        x: Number.parseFloat((node as HTMLElement).style.left),
        duration: node.getAnimations()[0].effect!.getTiming().duration,
      })),
    );
  expect(geometry.every((item) => item.x <= 10 || item.x >= 1270)).toBe(true);
  expect(geometry.every((item) => item.duration === 2200)).toBe(true);
  await page.clock.runFor(2200);
  await expect(page.locator(".finish-confetti i")).toHaveCount(0);
  await page.keyboard.press("F2");
  await setGraphicsQuality(page, "high");
  await page.keyboard.press("Escape");
  await expect(page.locator(".finish-confetti i")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox")).toBeFocused();
});

test("combo edge bursts only fire at tier gains and clear on a mistake or restart", async ({
  page,
}) => {
  await ready(page);
  const text = await passage(page);
  const input = page.getByRole("textbox");
  await input.fill(text.slice(0, 24));
  await expect(page.locator(".combo-edge-particles i")).toHaveCount(0);
  await expect(page.locator(".combo-vignette")).toHaveCount(0);
  await input.press(text[24]);
  await expect(page.locator(".combo-edge-particles i")).toHaveCount(12);
  await expect(page.locator(".combo-vignette")).toHaveAttribute(
    "data-tier",
    "1",
  );
  await page.clock.runFor(750);
  await expect(page.locator(".combo-edge-particles i")).toHaveCount(0);
  await input.pressSequentially(text.slice(25, 59));
  await expect(page.locator(".combo-edge-particles i")).toHaveCount(0);
  await input.press(text[59]);
  await expect(page.locator(".combo-edge-particles i")).toHaveCount(12);
  await input.press("#");
  await expect(page.locator(".combo-edge-particles i")).toHaveCount(0);
  await input.press("Tab");
  await input.fill(text.slice(0, 350));
  await expect(page.locator(".combo-edge-particles i")).toHaveCount(12);
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "350");
  await expect(page.locator(".combo-meter")).toContainText("3.0× XP");
  await input.press("Tab");
  await expect(page.locator(".combo-edge-particles i")).toHaveCount(0);
});

test("Off, Low and reduced motion suppress new effects, and changing controls does not replay a finish", async ({
  page,
}) => {
  await ready(page);
  for (const mode of ["off", "low", "reduced"] as const) {
    await page
      .getByRole("button", { name: "Open settings", exact: true })
      .click();
    await setGraphicsQuality(page, mode === "low" ? "low" : "medium");
    await page
      .getByRole("slider", { name: "Visual effects" })
      .press(mode === "off" ? "Home" : "End");
    await page.keyboard.press("Escape");
    await page.emulateMedia({
      reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
    });
    await page.getByRole("textbox").press("Tab");
    await page.getByRole("textbox").fill((await passage(page)).slice(0, 100));
    await expect(page.locator(".combo-edge-particles i")).toHaveCount(0);
    await page.clock.fastForward(30000);
    await expect(
      page.getByRole("heading", { name: "Sprint results" }),
    ).toBeFocused();
    await expect(page.locator(".finish-confetti i")).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox")).toBeFocused();
  }
});

test("Zen Finish celebrates, Pause and restored summaries do not, and hiding cancels effects", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("textbox").fill((await passage(page)).slice(0, 30));
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".finish-confetti i")).toHaveCount(0);
  await expect(page.locator(".combo-edge-particles i")).toHaveCount(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.locator(".finish-confetti i")).toHaveCount(50);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".finish-confetti i")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(page.locator(".finish-confetti i")).toHaveCount(0);
});

test("new Daily scores never mix with or overwrite old reward-rule records", async ({
  page,
}) => {
  const old = JSON.stringify({
    version: 1,
    records: [
      {
        id: "legacy",
        day: "2026-10-19",
        score: 99999,
        wpm: 100,
        accuracy: 100,
        combo: 200,
      },
    ],
  });
  await page.addInitScript(
    (value) => localStorage.setItem("h2otype.daily-scores.v1", value),
    old,
  );
  await ready(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await page.getByRole("textbox").fill((await passage(page)).slice(0, 100));
  await page.clock.fastForward(15000);
  await expect(
    page.getByRole("heading", { name: "Daily results" }),
  ).toBeFocused();
  const saved = await page.evaluate(() => ({
    old: localStorage.getItem("h2otype.daily-scores.v1"),
    current: JSON.parse(localStorage.getItem("h2otype.daily-scores.v3")!),
  }));
  expect(saved.old).toBe(old);
  expect(saved.current.records).toHaveLength(1);
  expect(saved.current.records[0].score).toBe(1275);
});
