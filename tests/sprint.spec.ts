import { expect, test } from "@playwright/test";
import { isBetter, parseBests } from "../src/sprintRecords";

for (const duration of [15, 30, 60]) {
  test(`${duration}s Sprint starts on typing, ends at its deadline, and restarts with Enter`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-18T12:00:00Z"));
    await page.goto("/");
    await page
      .getByRole("button", { name: `${duration}s`, exact: true })
      .click();
    const input = page.getByRole("textbox", { name: "Type the passage" });
    if (duration !== 30) await expect(input).toBeFocused();
    await page.clock.fastForward(90_000);
    await expect(page.getByRole("timer")).toHaveText(`${duration}s remaining`);
    await input.pressSequentially("slow down ");
    await page.clock.fastForward((duration - 1) * 1000);
    await expect(
      page.getByRole("heading", { name: "Sprint results" }),
    ).toHaveCount(0);
    await page.clock.fastForward(1000);
    const heading = page.getByRole("heading", { name: "Sprint results" });
    await expect(heading).toBeFocused();
    await expect(page.getByTestId("result-wpm")).toHaveText(
      String(Math.round(120 / duration)),
    );
    await expect(page.locator(".record-summary")).toContainText(
      `New best · ${duration}s`,
    );
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await page.keyboard.press("Enter");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("");
    await expect(page.getByRole("timer")).toHaveText(`${duration}s remaining`);
    await expect(
      page.getByRole("button", { name: `${duration}s`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });
}

test("duration changes discard an active run without saving and reset the clock", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-18T12:00:00Z"));
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Type the passage" });
  await input.pressSequentially("slow");
  await page.clock.fastForward(10_000);
  await page.getByRole("button", { name: "60s", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("timer")).toHaveText("60s remaining");
  await page.clock.fastForward(50_000);
  await expect(
    page.getByRole("heading", { name: "Sprint results" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("h2otype.sprint-bests.v1")),
  ).toBeNull();
});

test("personal bests survive reload, stay separate by duration, and retain faster results", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-18T12:00:00Z"));
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Type the passage" });
  await page.getByRole("button", { name: "15s", exact: true }).click();
  await input.pressSequentially("slow down ");
  await page.clock.fastForward(15_000);
  await expect(page.locator(".record-summary")).toContainText(
    "New best · 15s: 8 WPM",
  );
  await page.reload();
  await input.pressSequentially("slow down ");
  await page.clock.fastForward(30_000);
  await expect(page.locator(".record-summary")).toContainText(
    "New best · 30s: 4 WPM",
  );
  await page.getByRole("button", { name: "15s", exact: true }).click();
  await input.press("s");
  await page.clock.fastForward(15_000);
  await expect(page.locator(".record-summary")).toContainText(
    "Personal best · 15s: 8 WPM",
  );
  const saved = await page.evaluate(() =>
    localStorage.getItem("h2otype.sprint-bests.v1"),
  );
  expect(parseBests(saved)).toEqual({
    15: { wpm: 8, accuracy: 100 },
    30: { wpm: 4, accuracy: 100 },
  });
});

test("blocked storage does not prevent results or restart", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Unavailable");
      },
    });
  });
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-18T12:00:00Z"));
  await page.goto("/");
  await page.getByRole("textbox").pressSequentially("slow");
  await page.clock.fastForward(30_000);
  await expect(page.locator(".record-summary")).toContainText(
    "Browser storage is unavailable",
  );
  await expect(page.getByTestId("result-wpm")).toHaveText("2");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByRole("textbox")).toBeFocused();
});

test("corrupt records recover and early passage completion cannot earn a best", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("h2otype.sprint-bests.v1", "{broken"),
  );
  const passage = await page.locator(".passage").innerText();
  await page.getByRole("textbox").fill(passage);
  await expect(page.locator(".record-summary")).toContainText(
    "Complete the full timer",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("h2otype.sprint-bests.v1")),
  ).toBe("{broken");
});

test("best validation rejects malformed data and tie-breaking prefers accuracy", () => {
  expect(parseBests("{bad")).toEqual({});
  expect(
    parseBests(
      JSON.stringify({
        version: 9,
        bests: { 15: { wpm: 100, accuracy: 100 } },
      }),
    ),
  ).toEqual({});
  expect(
    parseBests(
      JSON.stringify({
        version: 1,
        bests: {
          15: { wpm: -1, accuracy: 100 },
          30: { wpm: 50, accuracy: 101 },
          60: { wpm: 70, accuracy: 99 },
        },
      }),
    ),
  ).toEqual({ 60: { wpm: 70, accuracy: 99 } });
  expect(isBetter({ wpm: 70, accuracy: 100 }, { wpm: 70, accuracy: 99 })).toBe(
    true,
  );
  expect(isBetter({ wpm: 60, accuracy: 100 }, { wpm: 70, accuracy: 99 })).toBe(
    false,
  );
  expect(isBetter({ wpm: 70, accuracy: 99 }, { wpm: 70, accuracy: 99 })).toBe(
    false,
  );
});

test("results fit small screens and storage write failures are reported", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Quota exceeded");
    };
  });
  await page.clock.install({ time: new Date("2026-10-18T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-18T12:00:00Z"));
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("textbox").pressSequentially("slow");
    await page.clock.fastForward(30_000);
    await expect(page.locator(".record-summary")).toContainText(
      "This result cannot be saved.",
    );
    const bounds = await page.locator(".typing-space").boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        localStorage.getItem("h2otype.sprint-bests.v1"),
      ),
    ).toBeNull();
  }
});
