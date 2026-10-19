import { expect, test } from "./practice-fixture";
import type { Page } from "@playwright/test";
import { setWpmRefresh } from "./settings";

async function clock(page: Page) {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00Z"));
}
async function settings(page: Page) {
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
}
async function closeSettings(page: Page) {
  await page
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
}
const liveWpm = (page: Page) =>
  page
    .locator(".live-stats div")
    .filter({ has: page.getByText("WPM", { exact: true }) })
    .locator("dd");
const totalXp = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("h2otype.progress.v1")!).totalXp,
  );

test("Tab restarts from initial page focus, header controls, passage clicks, and blurred fields", async ({
  page,
}) => {
  await clock(page);
  await page.goto("/");
  const input = page.getByRole("textbox");
  await expect(input).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();

  for (const mode of ["Sprint", "Zen"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page.keyboard.press("Tab");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("");
    for (const target of [
      "passage",
      "blur",
      "settings-button",
      "action-button",
    ]) {
      await input.pressSequentially(mode === "Sprint" ? "slow" : "there");
      const earned = await totalXp(page);
      if (target === "passage") await page.locator(".passage").click();
      if (target === "blur") await input.evaluate((element) => element.blur());
      if (target === "settings-button")
        await page
          .getByRole("button", { name: "Open settings", exact: true })
          .focus();
      if (target === "action-button")
        await page
          .getByRole("button", {
            name: mode === "Sprint" ? "Restart" : "Finish",
            exact: true,
          })
          .focus();
      await page.keyboard.press("Tab");
      await expect(input).toBeFocused();
      await expect(input).toHaveValue("");
      await expect(page.locator(".character.correct")).toHaveCount(0);
      expect(await totalXp(page)).toBe(earned);
    }
  }
});

test("Tab restarts Sprint during play and results, retains XP/bests/duration, and cancels the old deadline", async ({
  page,
}) => {
  await clock(page);
  await page.goto("/");
  await page.getByRole("button", { name: "15s", exact: true }).click();
  const input = page.getByRole("textbox");
  await input.pressSequentially("slow");
  await page.clock.fastForward(10_000);
  await input.press("Tab");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.locator(".character.correct")).toHaveCount(0);
  await expect(page.getByRole("timer")).toHaveText("15s remaining");
  expect(await totalXp(page)).toBe(4);
  await input.press("s");
  await page.clock.fastForward(6000);
  await expect(page.getByRole("timer")).toHaveText("9s remaining");
  await page.clock.fastForward(9000);
  await expect(
    page.getByRole("heading", { name: "Sprint results" }),
  ).toBeFocused();
  const best = await page.evaluate(() =>
    localStorage.getItem("h2otype.sprint-bests.v1"),
  );
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("timer")).toHaveText("15s remaining");
  expect(await totalXp(page)).toBe(5);
  expect(
    await page.evaluate(() => localStorage.getItem("h2otype.sprint-bests.v1")),
  ).toBe(best);
  await page.clock.fastForward(30_000);
  await expect(page.getByRole("timer")).toHaveText("15s remaining");
});

test("Tab clears a Zen draft during play and pause, refocuses input, and keeps lifetime XP across reload", async ({
  page,
}) => {
  await clock(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  const input = page.getByRole("textbox");
  await input.pressSequentially("there");
  await page.clock.fastForward(5000);
  await input.press("Tab");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("timer")).toHaveText("0s elapsed");
  expect(await totalXp(page)).toBe(5);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("h2otype.progress.v1")!).zen,
    ),
  ).toBeNull();
  await input.pressSequentially("there");
  await input.press("Escape");
  await expect(page.getByRole("heading", { name: "Zen paused" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  expect(await totalXp(page)).toBe(10);
  await page.reload();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Zen paused" })).toHaveCount(
    0,
  );
  expect(await totalXp(page)).toBe(10);
});

test("Shift+Tab stays in typing, Settings retains Tab navigation, and held/composing Tab cannot restart", async ({
  page,
}) => {
  await clock(page);
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.pressSequentially("slow");
  await input.press("Shift+Tab");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("slow");
  await settings(page);
  const close = page.getByRole("button", {
    name: "Close settings",
    exact: true,
  });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).not.toBeFocused();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(input).toHaveValue("slow");
  await page.getByRole("slider", { name: "WPM refresh rate" }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("switch", { name: "Live WPM", exact: true }),
  ).toBeFocused();
  await closeSettings(page);
  await input.focus();
  for (const options of [
    { repeat: true },
    { isComposing: true },
    { ctrlKey: true },
    { altKey: true },
    { metaKey: true },
  ]) {
    await input.dispatchEvent("keydown", { key: "Tab", ...options });
    await expect(input).toHaveValue("slow");
  }
  await input.dispatchEvent("compositionstart");
  await input.dispatchEvent("keydown", { key: "Tab" });
  await expect(input).toHaveValue("slow");
  await input.dispatchEvent("compositionend", { data: "slow" });
  await input.press("Tab");
  await expect(input).toHaveValue("");
});

for (const mode of ["Sprint", "Zen"]) {
  test(`${mode} holds WPM between chosen updates, supports instant mode, and resets without stale values`, async ({
    page,
  }) => {
    await clock(page);
    await page.goto("/");
    await settings(page);
    const rate = page.getByRole("slider", { name: "WPM refresh rate" });
    await expect(rate).toHaveValue("1");
    await setWpmRefresh(page, 2000);
    await page.getByRole("switch", { name: "Live WPM", exact: true }).check();
    await page
      .getByRole("switch", { name: "Live accuracy", exact: true })
      .check();
    await closeSettings(page);
    if (mode === "Zen")
      await page.getByRole("button", { name: "Zen", exact: true }).click();
    const input = page.getByRole("textbox");
    await input.pressSequentially(mode === "Zen" ? "there" : "slow");
    await expect(liveWpm(page)).toHaveText("0");
    await page.clock.runFor(2000);
    await expect(liveWpm(page)).toHaveText(mode === "Zen" ? "30" : "24");
    const held = await liveWpm(page).innerText();
    await input.press("x");
    await page.clock.runFor(250);
    await expect(liveWpm(page)).toHaveText(held);
    await input.press("Backspace");
    await input.press("Space");
    await page.clock.runFor(1500);
    await expect(liveWpm(page)).toHaveText(held);
    await page.clock.runFor(250);
    await expect(liveWpm(page)).toHaveText(mode === "Zen" ? "18" : "15");
    await settings(page);
    await setWpmRefresh(page, 0);
    await closeSettings(page);
    await input.press(mode === "Zen" ? "i" : "d");
    await expect(liveWpm(page)).toHaveText(mode === "Zen" ? "21" : "18");
    await input.press("Tab");
    await expect(liveWpm(page)).toHaveText("0");
    await expect(page.locator(".live-stats")).toContainText("100%");
    await settings(page);
    await setWpmRefresh(page, 2000);
    await closeSettings(page);
    await input.press(mode === "Zen" ? "t" : "s");
    await page.clock.runFor(2000);
    await expect(liveWpm(page)).toHaveText("6");
    await input.press("Tab");
    await expect(liveWpm(page)).toHaveText("0");
    await page.reload();
    await settings(page);
    await expect(rate).toHaveValue("3");
  });
}

test("slow WPM refresh cannot delay Sprint's exact results or final XP", async ({
  page,
}) => {
  await clock(page);
  await page.goto("/");
  await settings(page);
  await setWpmRefresh(page, 2000);
  await page.getByRole("switch", { name: "Live WPM", exact: true }).check();
  await closeSettings(page);
  await page.getByRole("button", { name: "15s", exact: true }).click();
  await page.getByRole("textbox").pressSequentially("slow");
  await page.clock.runFor(14_000);
  await expect(liveWpm(page)).toHaveText("3");
  await page.getByRole("textbox").press(" ");
  await expect(liveWpm(page)).toHaveText("3");
  await page.clock.runFor(1000);
  await expect(page.getByTestId("result-wpm")).toHaveText("4");
  await expect(page.locator(".session-xp")).toHaveText("+5 XP this run");
  await expect(page.getByRole("timer")).toHaveText("0s remaining");
});
