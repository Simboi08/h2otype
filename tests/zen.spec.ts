import { expect, test } from "@playwright/test";

async function setupClock(page: import("@playwright/test").Page) {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00Z"));
  await page.goto("/");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
}

test("Zen continues through batches, clears words, and summarizes cumulative statistics", async ({
  page,
}) => {
  await setupClock(page);
  const input = page.getByRole("textbox");
  await input.pressSequentially("there ");
  await expect(input).toHaveValue("");
  let total = 6;
  for (let index = 0; index < 5; index++) {
    const text = await page.locator(".passage").innerText();
    const typed = await page.locator(".character.correct").count();
    const current = await input.inputValue();
    total += text.length - typed;
    await input.fill(text.slice(typed - current.length));
    await expect(
      page.getByRole("heading", { name: "Zen session", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".character.current")).toHaveCount(1);
    expect(await page.locator(".character").count()).toBeLessThan(1200);
  }
  await page.clock.fastForward(60_000);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Zen session", exact: true }),
  ).toBeFocused();
  await expect(
    page
      .locator(".result-grid div")
      .filter({ hasText: "Characters" })
      .locator("dd"),
  ).toHaveText(String(total));
  await expect(
    page
      .locator(".result-grid div")
      .filter({ hasText: "Accuracy" })
      .locator("dd"),
  ).toHaveText("100%");
});

test("pause freezes input and time, resume focuses input, and new session resets counts", async ({
  page,
}) => {
  await setupClock(page);
  const input = page.getByRole("textbox");
  await input.pressSequentially("there");
  await page.clock.fastForward(10_000);
  await input.press("Escape");
  await expect(page.getByRole("heading", { name: "Zen paused" })).toBeFocused();
  await page.clock.fastForward(90_000);
  await expect(page.getByRole("timer")).toHaveText("10s elapsed");
  await expect(input).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("there");
  await page.clock.fastForward(5000);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("15s elapsed");
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("timer")).toHaveText("0s elapsed");
});

test("reload restores paused progress and excludes offline time", async ({
  page,
}) => {
  await setupClock(page);
  await page.getByRole("textbox").pressSequentially("there ");
  await page.clock.fastForward(12_000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zen paused" })).toBeVisible();
  await page.clock.fastForward(100_000);
  await expect(page.getByRole("timer")).toHaveText("12s elapsed");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.locator(".character.correct")).toHaveCount(6);
  await expect(page.getByRole("textbox")).toHaveValue("");
  await page.getByRole("textbox").pressSequentially("is");
  await expect(page.locator(".character.correct")).toHaveCount(8);
});

test("Sprint switches directly from Zen and keeps a paused resumable draft without counting time away", async ({
  page,
}) => {
  await setupClock(page);
  await page.getByRole("textbox").pressSequentially("there");
  await page.clock.fastForward(5000);
  await page.getByRole("button", { name: "Sprint", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Go to Sprint", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("textbox")).toBeFocused();
  await expect(page.getByRole("timer")).toHaveText("30s remaining");
  await page.clock.fastForward(10_000);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Zen paused", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("there");
  await expect(page.getByRole("timer")).toHaveText("5s elapsed");
});

test("hidden tabs pause and periodic saves retain active progress", async ({
  page,
}) => {
  await setupClock(page);
  await page.getByRole("textbox").pressSequentially("there");
  await page.clock.fastForward(5000);
  const snapshot = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("h2otype.progress.v1")!),
  );
  expect(snapshot.zen.session.typed).toBe("there");
  expect(snapshot.zen.elapsedMs).toBe(5000);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("heading", { name: "Zen paused" })).toBeVisible();
  await page.clock.fastForward(60_000);
  await expect(page.getByRole("timer")).toHaveText("5s elapsed");
});

test("blocked storage keeps Zen playable and corrupt saves are ignored", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Unavailable");
      },
    }),
  );
  await setupClock(page);
  await expect(page.locator(".storage-note")).toContainText(
    "Browser storage is unavailable",
  );
  await page.getByRole("textbox").pressSequentially("there");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("there");
});

test("Zen summary stays within the viewport on a small phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await setupClock(page);
  await page.getByRole("textbox").pressSequentially("there");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const bounds = await page.locator(".typing-space").boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("reloading an active session flushes edits newer than the last periodic save", async ({
  page,
}) => {
  await setupClock(page);
  await page.getByRole("textbox").pressSequentially("there");
  await page.clock.fastForward(5000);
  await page.getByRole("textbox").pressSequentially(" is");
  await page.clock.fastForward(2000);
  await page.reload();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zen paused" })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText("7s elapsed");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("is");
  await expect(page.locator(".character.correct")).toHaveCount(8);
});

test("corrupt saves recover and failed writes do not lose in-memory progress", async ({
  page,
}) => {
  await setupClock(page);
  await page.getByRole("button", { name: "Sprint", exact: true }).click();
  await page.evaluate(() => {
    localStorage.setItem("h2otype.zen-session.v1", "{broken");
    Storage.prototype.setItem = () => {
      throw new Error("Quota exceeded");
    };
  });
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("");
  await page.getByRole("textbox").pressSequentially("there");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".storage-note")).toContainText(
    "Browser storage is unavailable",
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("there");
});
