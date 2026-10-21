import { expect, test } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { handleDaily } from "../server/dailyApi";
import type { Run } from "../server/dailyApi";
import { dailyRulesVersion, replayDaily } from "../src/dailyChallenge";

test("compiled API artifact works without source TypeScript files", () => {
  expect(
    execFileSync(process.execPath, ["scripts/check-api-build.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 20000,
    }),
  ).toContain("PASS compiled API artifact");
});

test("modern Supabase server keys use apikey without an invalid Bearer token", async () => {
  const fetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const headers = new Headers(init?.headers);
    expect(headers.get("apikey")).toBe("sb_secret_test-only-not-a-real-key");
    expect(headers.has("authorization")).toBe(false);
    return Response.json([]);
  };
  try {
    const response = await handleDaily(
      new Request("https://h2otype.test/api/daily", {
        method: "POST",
        body: JSON.stringify({
          action: "list",
          day: "2026-10-20",
          rulesVersion: dailyRulesVersion,
        }),
      }),
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SECRET_KEY: "sb_secret_test-only-not-a-real-key",
      },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ scores: [] });
  } finally {
    globalThis.fetch = fetch;
  }
});

async function ready(page: Page, time = "2026-10-20T12:00:00Z") {
  await page.clock.install({ time: new Date(Date.parse(time) - 1000) });
  await page.clock.pauseAt(new Date(time));
  await page.goto("/");
  await expect(page.getByRole("textbox")).toBeFocused();
}
async function backend(page: Page) {
  const runs = new Map<string, Run>();
  const submitted: {
    id: string;
    player: string;
    events: unknown;
    score: number;
  }[] = [];
  let own: {
    display_name: string;
    score: number;
    wpm: number;
    accuracy: number;
    best_combo: number;
    rank: number;
  } | null = null;
  let unavailable = false;
  let submitFailures = 0;
  let begins = 0;
  let submitCalls = 0;
  let delayedList: Route | undefined;
  let holdList = false;
  await page.route("**/api/daily", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "begin") begins++;
    if (unavailable)
      return route.fulfill({
        status: 503,
        json: { error: "Shared rankings are not connected yet." },
      });
    if (body.action === "list") {
      if (holdList) {
        delayedList = route;
        return;
      }
      return route.fulfill({
        json: { scores: own ? [{ ...own, is_you: true }] : [], standing: own },
      });
    }
    if (body.action === "begin") {
      const id = crypto.randomUUID();
      runs.set(id, {
        id,
        day: body.day,
        rules_version: dailyRulesVersion,
        started_at: "2026-10-20T11:59:30Z",
        used: false,
      });
      return route.fulfill({ json: { id } });
    }
    submitCalls++;
    if (submitFailures > 0) {
      submitFailures--;
      return route.fulfill({
        status: 503,
        json: {
          error:
            "Rankings are unavailable. Your local score is saved; try again.",
        },
      });
    }
    const run = runs.get(body.id)!;
    const replay = replayDaily(run.day, body.events);
    expect(run).toBeTruthy();
    submitted.push({
      id: body.id,
      player: body.player,
      events: body.events,
      score: replay.score,
    });
    if (!own || replay.score > own.score)
      own = {
        display_name: body.name,
        score: replay.score,
        wpm: replay.metrics.wpm,
        accuracy: replay.metrics.accuracy,
        best_combo: replay.session.bestCombo,
        rank: Math.max(1, 70 - submitted.length),
      };
    await route.fulfill({
      json: { scores: own ? [{ ...own, is_you: true }] : [], standing: own },
    });
  });
  return {
    submitted,
    get begins() {
      return begins;
    },
    get submitCalls() {
      return submitCalls;
    },
    set unavailable(value: boolean) {
      unavailable = value;
    },
    set submitFailures(value: number) {
      submitFailures = value;
    },
    set holdList(value: boolean) {
      holdList = value;
    },
    get delayedList() {
      return delayedList;
    },
  };
}
async function finish(page: Page, characters: number) {
  const text = (await page.locator(".passage").textContent())!;
  const begun = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/daily") &&
      response.request().postDataJSON().action === "begin",
  );
  await page.getByRole("textbox").fill(text.slice(0, characters));
  await begun;
  await page.clock.fastForward(15000);
  await expect(
    page.getByRole("heading", { name: "Daily results" }),
  ).toBeVisible();
}
const rankings = (page: Page) =>
  page.getByRole("dialog", { name: "Daily rankings" });
async function openSubmission(page: Page) {
  await expect(rankings(page)).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Daily results" }),
  ).toBeFocused();
  const invite = page.getByRole("button", { name: "Open daily leaderboard" });
  await expect(invite).toHaveAttribute("data-pending", "true");
  await invite.click();
  await expect(invite).toHaveAttribute("data-pending", "false");
}
async function confirm(page: Page, name = "Simon") {
  if (!(await rankings(page).isVisible())) await openSubmission(page);
  await expect(rankings(page)).toBeVisible();
  await expect(page.getByLabel("Display name", { exact: false })).toBeFocused();
  await page.getByLabel("Display name", { exact: false }).fill(name);
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await expect(rankings(page).getByRole("status")).toContainText(
    "Score submitted",
  );
}

test("leaderboard is available before playing in all modes and restores typing focus", async ({
  page,
}) => {
  await backend(page);
  await ready(page);
  for (const mode of ["Sprint", "Zen", "Daily"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page.getByRole("button", { name: "Open daily leaderboard" }).click();
    await expect(rankings(page)).toBeVisible();
    await expect(rankings(page)).toContainText("No submitted scores yet");
    await page.keyboard.press("Tab");
    await expect(rankings(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("x");
    await expect(page.getByRole("textbox")).toHaveValue("x");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox")).toHaveValue("");
  }
});

test("first Daily best prompts once; better runs auto-update rank, slower runs do not, and consent survives reload", async ({
  page,
}) => {
  const api = await backend(page);
  await ready(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await finish(page, 100);
  await confirm(page);
  expect(api.submitted).toHaveLength(1);
  await expect(page.locator(".leaderboard-button")).toContainText("#69");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await finish(page, 200);
  await expect.poll(() => api.submitted.length).toBe(2);
  await expect(rankings(page)).not.toBeVisible();
  await expect(page.locator(".leaderboard-button")).toContainText("#68");
  await page.keyboard.press("Tab");
  await finish(page, 50);
  expect(api.submitted).toHaveLength(2);
  await page.reload();
  await expect(page.locator(".leaderboard-button")).toContainText("#68");
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await finish(page, 220);
  await expect.poll(() => api.submitted.length).toBe(3);
  expect(new Set(api.submitted.map((entry) => entry.player)).size).toBe(1);
  expect(api.submitted.map((entry) => entry.score)).toEqual([1275, 3185, 3685]);
  await expect(rankings(page)).not.toBeVisible();
});

test("midnight clears today's rank and asks again with the remembered name", async ({
  page,
}) => {
  const api = await backend(page);
  await ready(page, "2026-10-20T23:59:00Z");
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await finish(page, 100);
  await confirm(page);
  await page.keyboard.press("Escape");
  await page.clock.fastForward(45050);
  await expect(page.locator(".leaderboard-button")).not.toContainText("#69");
  await page.keyboard.press("Tab");
  await finish(page, 50);
  await openSubmission(page);
  await expect(rankings(page)).toBeVisible();
  await expect(page.getByLabel("Display name", { exact: false })).toHaveValue(
    "Simon",
  );
  expect(api.submitted).toHaveLength(1);
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  expect(api.submitted).toHaveLength(1);
});

test("missing backend explains failure and retains local scores without prompting an unusable form", async ({
  page,
}) => {
  const api = await backend(page);
  api.unavailable = true;
  await ready(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await finish(page, 100);
  await expect(rankings(page)).not.toBeVisible();
  await expect(page.locator(".publication-message")).toContainText(
    "not connected",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("h2otype.daily-scores.v5")!).records[0]
          .score,
    ),
  ).toBe(1275);
  await page.getByRole("button", { name: "Open daily leaderboard" }).click();
  await expect(rankings(page).getByRole("status")).toContainText(
    "not connected",
  );
  await expect(
    page.getByRole("button", { name: "Submit score", exact: true }),
  ).toHaveCount(0);
  expect(api.submitCalls).toBe(0);
  await expect(
    rankings(page).getByRole("button", { name: "Refresh rankings" }),
  ).toBeEnabled();
  const message = await rankings(page).getByRole("status").textContent();
  expect(
    message!.match(/Shared rankings are not connected yet\./g),
  ).toHaveLength(1);
});

test("failed submission survives mode switches and retries the same immutable run", async ({
  page,
}) => {
  const api = await backend(page);
  api.submitFailures = 1;
  await ready(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await finish(page, 100);
  await openSubmission(page);
  await page.getByLabel("Display name", { exact: false }).fill("Simon");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await expect(rankings(page).getByRole("status")).toContainText("try again");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Sprint", exact: true }).click();
  await page.getByRole("textbox").fill("different text");
  await page.getByRole("button", { name: "Open daily leaderboard" }).click();
  await confirm(page);
  expect(api.submitCalls).toBe(2);
  expect(api.submitted).toHaveLength(1);
  expect(api.submitted[0].score).toBe(1275);
  expect(api.submitted[0].events).toEqual([
    expect.objectContaining({ at: 0, add: expect.any(String) }),
  ]);
});

test("a late list response cannot erase a newly submitted standing or block Submit", async ({
  page,
}) => {
  const api = await backend(page);
  api.holdList = true;
  await ready(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await finish(page, 100);
  await openSubmission(page);
  await expect.poll(() => Boolean(api.delayedList)).toBe(true);
  await confirm(page);
  await api.delayedList!.fulfill({ json: { scores: [], standing: null } });
  await expect(rankings(page)).toContainText("#69");
  await expect(rankings(page).locator("table").first()).toContainText("Simon");
});

test("leaderboard button and prompted form fit phone and short landscape screens", async ({
  page,
}) => {
  await backend(page);
  await ready(page);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 740, height: 320 },
  ]) {
    await page.setViewportSize(viewport);
    if (viewport.width === 320) {
      await page.getByRole("button", { name: "Daily", exact: true }).click();
      await finish(page, 100);
      await confirm(page);
      await page.keyboard.press("Escape");
    }
    const button = page.getByRole("button", { name: "Open daily leaderboard" });
    const rect = (await button.boundingBox())!;
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.y + rect.height).toBeLessThan(72);
    await button.click();
    const modal = (await rankings(page).boundingBox())!;
    expect(modal.y).toBeGreaterThanOrEqual(0);
    expect(modal.y + modal.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
  }
});

test("slow begin delivery waits for token maturity without weakening the 15-second game clock", async ({
  page,
}) => {
  let begin: Route | undefined;
  let submits = 0;
  await page.route("**/api/daily", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "begin") {
      begin = route;
      return;
    }
    if (body.action === "submit") submits++;
    await route.fulfill({ json: { scores: [], standing: null } });
  });
  await ready(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/daily") &&
      r.request().postDataJSON().action === "begin",
  );
  await page
    .getByRole("textbox")
    .fill((await page.locator(".passage").textContent())!.slice(0, 100));
  await expect.poll(() => Boolean(begin)).toBe(true);
  await page.clock.fastForward(7000);
  await begin!.fulfill({
    json: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
  });
  await response;
  await page.clock.fastForward(8000);
  await expect(page.locator("[role=timer]")).toHaveText("0s remaining");
  await openSubmission(page);
  await page.getByLabel("Display name", { exact: false }).fill("Simon");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  expect(submits).toBe(0);
  await page.clock.runFor(4999);
  expect(submits).toBe(0);
  await page.clock.runFor(1);
  await expect.poll(() => submits).toBe(1);
  await expect(rankings(page).getByRole("status")).toContainText(
    "Score submitted",
  );
});

test("in-memory guest identity and automatic updates work when storage is blocked", async ({
  page,
}) => {
  const api = await backend(page);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await ready(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await finish(page, 100);
  await confirm(page);
  await expect(rankings(page)).toContainText("only be kept for this visit");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await finish(page, 200);
  await expect.poll(() => api.submitted.length).toBe(2);
  expect(api.submitted[0].player).toBe(api.submitted[1].player);
  await expect(rankings(page)).not.toBeVisible();
});

test("closing leaderboard returns paused Zen to its summary for Enter to resume", async ({
  page,
}) => {
  await backend(page);
  await ready(page);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("textbox").press("a");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Zen paused" })).toBeFocused();
  await page.getByRole("button", { name: "Open daily leaderboard" }).click();
  await expect(rankings(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Zen paused" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox")).toBeFocused();
});

test("Vercel non-JSON failures appear once with the original run guidance", async ({
  page,
}) => {
  await page.route("**/api/daily", (route) =>
    route.fulfill({
      status: 500,
      contentType: "text/plain",
      body: "FUNCTION_INVOCATION_FAILED",
    }),
  );
  await ready(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await finish(page, 100);
  await page.getByRole("button", { name: "Open daily leaderboard" }).click();
  const status = rankings(page).getByRole("status");
  await expect(status).toContainText("Play a fresh Daily");
  await expect(
    rankings(page).getByRole("button", { name: "Refresh rankings" }),
  ).toBeEnabled();
  const text = await status.textContent();
  expect(text!.match(/The leaderboard server is unavailable\./g)).toHaveLength(
    1,
  );
});

test("Daily invitation pulses without opening, becomes static for motion preferences and dismisses without publishing", async ({
  page,
}) => {
  const api = await backend(page);
  await ready(page);
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await finish(page, 100);
  const invite = page.getByRole("button", { name: "Open daily leaderboard" });
  await expect(invite).toHaveAttribute("data-pending", "true");
  const animation = () =>
    invite.evaluate(
      (button) => getComputedStyle(button, "::after").animationName,
    );
  expect(await animation()).toBe("leaderboard-invite");
  await expect(rankings(page)).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await animation()).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.keyboard.press("F2");
  await page.getByRole("slider", { name: "Graphics quality" }).press("Home");
  await page.keyboard.press("Escape");
  expect(await animation()).toBe("none");
  await expect(invite).toHaveAttribute("aria-description", /Daily best ready/);
  await openSubmission(page);
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(invite).toHaveAttribute("data-pending", "false");
  expect(api.submitCalls).toBe(0);
});
