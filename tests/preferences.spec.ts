import { expect, test } from "@playwright/test";
import { defaultPreferences, parsePreferences } from "../src/preferences";

async function openSettings(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
}
async function closeSettings(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
}
async function clock(page: import("@playwright/test").Page) {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00Z"));
}
async function enableStats(page: import("@playwright/test").Page) {
  await openSettings(page);
  await page.getByRole("switch", { name: "Live WPM", exact: true }).check();
  await page
    .getByRole("switch", { name: "Live accuracy", exact: true })
    .check();
  await page
    .getByRole("combobox", { name: "WPM refresh rate" })
    .selectOption("0");
  await closeSettings(page);
}
const stat = (page: import("@playwright/test").Page, name: string) =>
  page
    .locator(".live-stats div")
    .filter({ has: page.getByText(name, { exact: true }) })
    .locator("dd");

test("preferences validate partial boolean fields and fall back safely for invalid data", () => {
  for (const raw of [
    null,
    "{bad",
    "{}",
    JSON.stringify({ version: 9, preferences: { liveWpm: true } }),
  ])
    expect(parsePreferences(raw)).toEqual(defaultPreferences);
  expect(
    parsePreferences(
      JSON.stringify({
        version: 1,
        preferences: {
          liveWpm: true,
          liveAccuracy: "true",
          xpProgress: false,
          levelNotifications: 0,
          unknown: true,
        },
      }),
    ),
  ).toEqual({
    liveWpm: true,
    liveAccuracy: false,
    xpProgress: false,
    levelNotifications: true,
    wpmRefreshMs: 500,
  });
});

test("WPM refresh validation accepts supported intervals and migrates existing preferences", () => {
  for (const value of [0, 500, 1000, 2000]) {
    expect(
      parsePreferences(
        JSON.stringify({
          version: 1,
          preferences: { liveWpm: true, wpmRefreshMs: value },
        }),
      ),
    ).toEqual({ ...defaultPreferences, liveWpm: true, wpmRefreshMs: value });
  }
  for (const value of [null, true, "1000", -1, 1, 250, 1e10]) {
    expect(
      parsePreferences(
        JSON.stringify({
          version: 1,
          preferences: { liveWpm: true, wpmRefreshMs: value },
        }),
      ),
    ).toEqual({ ...defaultPreferences, liveWpm: true });
  }
});

test("defaults stay quiet and every display preference and theme survive reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".live-stats")).toHaveCount(0);
  await expect(
    page.getByRole("progressbar", { name: "Level XP" }),
  ).toBeVisible();
  await openSettings(page);
  await expect(
    page.getByRole("switch", { name: "Live WPM", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Live accuracy", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("switch", { name: "XP progress", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Level-up notifications", exact: true }),
  ).toBeChecked();
  await page.getByRole("switch", { name: "Live WPM", exact: true }).check();
  await page
    .getByRole("switch", { name: "Live accuracy", exact: true })
    .check();
  await page
    .getByRole("switch", { name: "XP progress", exact: true })
    .uncheck();
  await page
    .getByRole("switch", { name: "Level-up notifications", exact: true })
    .uncheck();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await closeSettings(page);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(stat(page, "WPM")).toHaveText("0");
  await expect(stat(page, "Accuracy")).toHaveText("100%");
  await openSettings(page);
  await expect(
    page.getByRole("switch", { name: "Live WPM", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Live accuracy", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("switch", { name: "XP progress", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Level-up notifications", exact: true }),
  ).not.toBeChecked();
});

test("Sprint live stats track corrections and settings preserve input, clock, and pointer focus", async ({
  page,
}) => {
  await clock(page);
  await page.goto("/");
  await enableStats(page);
  const input = page.getByRole("textbox");
  await input.pressSequentially("slx");
  await page.clock.fastForward(10_000);
  await expect(stat(page, "WPM")).toHaveText("2");
  await expect(stat(page, "Accuracy")).toHaveText("67%");
  await openSettings(page);
  await page
    .getByRole("switch", { name: "Live accuracy", exact: true })
    .uncheck();
  await closeSettings(page);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("slx");
  await expect(page.getByRole("timer")).toHaveText("20s remaining");
  await expect(stat(page, "Accuracy")).toHaveCount(0);
  await openSettings(page);
  await page
    .getByRole("switch", { name: "Live accuracy", exact: true })
    .check();
  await closeSettings(page);
  await input.press("Backspace");
  await input.press("o");
  await expect(stat(page, "WPM")).toHaveText("4");
  await expect(stat(page, "Accuracy")).toHaveText("75%");
  await page.clock.fastForward(20_000);
  await expect(page.locator(".live-stats")).toHaveCount(0);
  await expect(page.locator(".sprint-results")).toContainText("75%");
});

test("Zen live stats use active time and resume preserves preferences", async ({
  page,
}) => {
  await clock(page);
  await page.goto("/");
  await enableStats(page);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  const input = page.getByRole("textbox");
  await input.pressSequentially("there");
  await page.clock.fastForward(10_000);
  await expect(stat(page, "WPM")).toHaveText("6");
  await expect(stat(page, "Accuracy")).toHaveText("100%");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".live-stats")).toHaveCount(0);
  await page.clock.fastForward(60_000);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.fastForward(10_000);
  await expect(stat(page, "WPM")).toHaveText("3");
  await expect(page.getByRole("timer")).toHaveText("20s elapsed");
  await openSettings(page);
  await page.getByRole("switch", { name: "Live WPM", exact: true }).uncheck();
  await closeSettings(page);
  await expect(stat(page, "WPM")).toHaveCount(0);
  await expect(stat(page, "Accuracy")).toHaveText("100%");
});

test("hiding progress and notifications changes display only and never replays an old notice", async ({
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
  await openSettings(page);
  await page
    .getByRole("switch", { name: "XP progress", exact: true })
    .uncheck();
  await page
    .getByRole("switch", { name: "Level-up notifications", exact: true })
    .uncheck();
  await closeSettings(page);
  await page.getByRole("textbox").press("s");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.locator(".progress-notice")).toHaveText("");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("h2otype.progress.v1")!).totalXp,
    ),
  ).toBe(100);
  await openSettings(page);
  await page.getByRole("switch", { name: "XP progress", exact: true }).check();
  await page
    .getByRole("switch", { name: "Level-up notifications", exact: true })
    .check();
  await closeSettings(page);
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuemax",
    "200",
  );
  await expect(page.locator(".progress-notice")).toHaveText("");
  await page
    .getByRole("textbox")
    .fill((await page.locator(".passage").innerText()).slice(0, 201));
  await expect(page.locator(".progress-notice")).toHaveText("Level 3");
  await openSettings(page);
  await page
    .getByRole("switch", { name: "Level-up notifications", exact: true })
    .uncheck();
  await page
    .getByRole("switch", { name: "Level-up notifications", exact: true })
    .check();
  await closeSettings(page);
  await expect(page.locator(".progress-notice")).toHaveText("");
});

test("settings trap keyboard focus, switches work with Space, and Escape returns focus", async ({
  page,
}) => {
  await page.goto("/");
  const opener = page.getByRole("button", {
    name: "Open settings",
    exact: true,
  });
  await opener.focus();
  await page.keyboard.press("Enter");
  const close = page.getByRole("button", {
    name: "Close settings",
    exact: true,
  });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  const last = page.getByRole("switch", {
    name: "Level-up notifications",
    exact: true,
  });
  await expect(last).toBeFocused();
  await page.keyboard.press("Space");
  await expect(last).not.toBeChecked();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(opener).toBeFocused();
  // A fresh page tests entry order; reload may legitimately restore previous focus.
  const fresh = await page.context().newPage();
  await fresh.goto("/");
  await fresh.keyboard.press("Tab");
  await expect(
    fresh.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await fresh.keyboard.press("Enter");
  await expect(fresh.locator("#main")).toBeFocused();
  await fresh.close();
});

test("all displays fit small screens, settings scroll accessibly, and reduced motion keeps the caret still", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/");
  await openSettings(page);
  const dialog = page.getByRole("dialog", { name: "Settings", exact: true });
  const bounds = await dialog.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568);
  await page.getByRole("switch", { name: "Live WPM", exact: true }).check();
  await page
    .getByRole("switch", { name: "Live accuracy", exact: true })
    .check();
  await page
    .getByRole("switch", { name: "Level-up notifications", exact: true })
    .focus();
  await expect(
    page.getByRole("button", { name: "Close settings", exact: true }),
  ).toBeInViewport();
  await closeSettings(page);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const practice = await page.locator(".typing-space").boundingBox();
    expect(practice!.y).toBeGreaterThanOrEqual(0);
    expect(practice!.y + practice!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("textbox").focus();
    expect(
      await page
        .locator(".character.current")
        .evaluate(
          (element) => getComputedStyle(element, "::before").animationName,
        ),
    ).toBe("none");
    expect(
      await page
        .getByRole("button", { name: "Sprint", exact: true })
        .evaluate((element) => getComputedStyle(element).transitionDuration),
    ).toBe("0s");
  }
});

test("malformed preferences recover without replacing existing theme or XP", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("h2otype.preferences.v1", "{broken");
    localStorage.setItem("h2otype.theme", "dark");
    localStorage.setItem(
      "h2otype.progress.v1",
      JSON.stringify({ version: 1, totalXp: 200, zen: null }),
    );
  });
  await page.goto("/");
  await expect(page.locator(".live-stats")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await openSettings(page);
  await page.getByRole("switch", { name: "Live WPM", exact: true }).check();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("h2otype.progress.v1")!).totalXp,
    ),
  ).toBe(200);
});

test("failed preference writes keep controls functional for the visit and report the limitation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "h2otype.preferences.v1") throw new Error("Quota exceeded");
      original.call(this, key, value);
    };
  });
  await page.goto("/");
  await openSettings(page);
  await page.getByRole("switch", { name: "Live WPM", exact: true }).check();
  await expect(page.locator(".settings-storage-note")).toContainText(
    "cannot be saved",
  );
  await closeSettings(page);
  await expect(page.locator(".live-stats")).toBeVisible();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(page.locator(".live-stats")).toBeVisible();
  await page.reload();
  await expect(page.locator(".live-stats")).toHaveCount(0);
});
