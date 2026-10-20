import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { burstProfile } from "../src/screenBursts";

async function ready(page: Page, time = "2026-10-19T12:00:00Z") {
  await page.clock.install({ time: new Date(Date.parse(time) - 1000) });
  await page.clock.pauseAt(new Date(time));
  await page.goto("/");
  await expect(page.getByRole("textbox")).toBeFocused();
  await page.evaluate(() => document.fonts.ready);
}
async function finishDaily(page: Page, count: number) {
  const passage = (await page.locator(".passage").textContent())!;
  await page.getByRole("textbox").fill(passage.slice(0, count));
  await page.clock.fastForward(15000);
  await expect(
    page.getByRole("heading", { name: "Daily results" }),
  ).toBeFocused();
}

test("caret only blinks before starting, stays solid after deletion/blur/pause, and resets on a new run", async ({
  page,
}) => {
  await ready(page);
  for (const mode of ["Sprint", "Daily", "Zen"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    const caret = page.locator(".typing-caret");
    const input = page.getByRole("textbox");
    await input.focus();
    await expect(caret).toHaveCSS("animation-name", "caret-blink");
    const text = (await page.locator(".passage").textContent())!;
    await input.press(text[0]);
    await expect(caret).toHaveCSS("animation-name", "none");
    await input.press("Backspace");
    await expect(input).toHaveValue("");
    await expect(caret).toHaveCSS("animation-name", "none");
    await page.getByRole("button", { name: "Open settings" }).click();
    await page.getByRole("button", { name: "Close settings" }).click();
    await expect(caret).toHaveCSS("animation-name", "none");
    if (mode === "Zen") {
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      await expect(caret).toHaveCSS("animation-name", "none");
    }
    for (const at of [0, 500, 1100]) {
      await page.clock.runFor(at);
      await expect(caret).toHaveCSS("opacity", "1");
    }
    await input.press("Tab");
    await expect(caret).toHaveCSS("animation-name", "caret-blink");
  }
});

test("Daily prompt opens the challenge and updates to today's best without stealing results focus", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Daily challenge available", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveText("15s remaining");
  await finishDaily(page, 100);
  await expect(page.locator(".daily-status")).toContainText("1,275");
  await expect(page.locator(".finish-confetti i")).toHaveCount(240);
  await page.keyboard.press("Tab");
  await finishDaily(page, 50);
  await expect(page.locator(".daily-status")).toContainText("1,275");
  await page.keyboard.press("Tab");
  await finishDaily(page, 200);
  await expect(page.locator(".daily-status")).toContainText("3,185");
  await page.reload();
  await expect(page.locator(".daily-status")).toContainText("3,185");
  await expect(
    page.getByRole("button", { name: "Sprint", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("Daily status retains the best seen this visit if browser storage cannot save", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Quota exceeded");
    };
  });
  await ready(page);
  await page.locator(".daily-status").click();
  await finishDaily(page, 100);
  await page.keyboard.press("Tab");
  await finishDaily(page, 50);
  await expect(page.locator(".daily-status")).toContainText("1,275");
});

test("UTC midnight offers the next challenge and does not count a previous-day finish as today's result", async ({
  page,
}) => {
  await ready(page, "2026-10-19T23:59:50Z");
  await page.locator(".daily-status").click();
  await finishDaily(page, 100);
  await expect(page.locator(".results-context")).toContainText("2026-10-19");
  await expect(page.locator(".daily-status")).toHaveAccessibleName(
    "Daily challenge available",
  );
  await page.keyboard.press("Tab");
  await expect(page.locator(".daily-label")).toContainText("2026-10-20");
  await finishDaily(page, 100);
  await expect(page.locator(".daily-status")).toContainText("1,275");
});

test("Daily badge updates across browser tabs and clears when stored records are cleared", async ({
  page,
  context,
}) => {
  await ready(page);
  const other = await context.newPage();
  await ready(other);
  await page.locator(".daily-status").click();
  await finishDaily(page, 100);
  await expect(other.locator(".daily-status")).toContainText("1,275");
  await page.evaluate(() => localStorage.removeItem("h2otype.daily-scores.v5"));
  await expect(other.locator(".daily-status")).toHaveAccessibleName(
    "Daily challenge available",
  );
});

test("more finish confetti remains bounded, larger, longer-lived and adjustable", async ({
  page,
}) => {
  expect(burstProfile("finish", "high", 2, 150)).toEqual({
    count: 240,
    duration: 2200,
  });
  expect(burstProfile("finish", "high", 2, 200).count).toBe(320);
  expect(burstProfile("finish", "high", 1, 150).count).toBe(120);
  expect(burstProfile("finish", "high", 2, 0).count).toBe(0);
  await ready(page);
  await page.getByRole("button", { name: "Open settings" }).click();
  await page
    .getByRole("slider", { name: "Finish confetti", exact: true })
    .press("End");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("textbox").press("a");
  await page.clock.fastForward(15000);
  await expect(page.locator(".finish-confetti i")).toHaveCount(320);
  const pieces = await page.locator(".finish-confetti i").evaluateAll((nodes) =>
    nodes.map((n) => ({
      width: parseFloat((n as HTMLElement).style.width),
      height: parseFloat((n as HTMLElement).style.height),
      duration: n.getAnimations()[0].effect!.getTiming().duration,
    })),
  );
  expect(
    pieces.every(
      (piece) =>
        piece.width >= 6 && piece.height >= 8 && piece.duration === 2200,
    ),
  ).toBe(true);
  const occupiedCells = await page.locator(".finish-confetti i").evaluateAll(
    (nodes) =>
      new Set(
        nodes.map((node) => {
          const frames = (
            node.getAnimations()[0].effect as KeyframeEffect
          ).getKeyframes();
          const matrix = new DOMMatrixReadOnly(
            String(frames.at(-1)!.transform),
          );
          const x = parseFloat((node as HTMLElement).style.left) + matrix.m41;
          const y = parseFloat((node as HTMLElement).style.top) + matrix.m42;
          return `${Math.floor(x / 40)},${Math.floor(y / 40)}`;
        }),
      ).size,
  );
  expect(occupiedCells).toBeGreaterThan(80); // a broad cloud instead of overlapping paths
  await page.clock.runFor(2200);
  await expect(page.locator(".finish-confetti i")).toHaveCount(0);
});

test("available and completed Daily badges fit inside narrow/short headers without overlap", async ({
  page,
}) => {
  await ready(page);
  for (const size of [
    { width: 320, height: 568 },
    { width: 740, height: 320 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(size);
    for (const completed of [false, true]) {
      if (completed) {
        await page.locator(".daily-status").click();
        await finishDaily(page, 100);
      }
      const header = (await page.locator(".header").boundingBox())!;
      const badge = (await page.locator(".daily-status").boundingBox())!;
      const nav = (await page.locator(".mode-switch").boundingBox())!;
      expect(badge.x).toBeGreaterThanOrEqual(0);
      expect(badge.x + badge.width).toBeLessThanOrEqual(nav.x);
      expect(badge.y + badge.height).toBeLessThanOrEqual(
        header.y + header.height,
      );
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true);
      if (completed)
        await page.getByRole("button", { name: "Sprint", exact: true }).click();
    }
  }
});
