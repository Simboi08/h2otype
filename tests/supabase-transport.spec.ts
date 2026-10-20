import { expect, test } from "@playwright/test";
import { handleDaily } from "../server/dailyApi";
import {
  createDaily,
  dailyRulesVersion,
  replayDaily,
} from "../src/dailyChallenge";

test("Supabase transport authenticates privately, versions queries and submits server-replayed rewards", async () => {
  const day = "2026-10-20";
  const now = Date.parse(day + "T12:00:00Z");
  const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const player = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
  const env = {
    SUPABASE_URL: "https://example.supabase.co/",
    SUPABASE_SERVICE_ROLE_KEY: "test-only-private-key",
  };
  const run = {
    id,
    day,
    started_at: new Date(now - 15000).toISOString(),
    used: false,
    rules_version: dailyRulesVersion,
    player_id: player,
  };
  const calls: {
    path: string;
    method: string;
    body: Record<string, unknown> | null;
  }[] = [];
  const events = [
    { at: 0, add: createDaily(day).passage.slice(0, 100) },
    { at: 12000, add: createDaily(day).passage.slice(100, 160) },
  ];
  const replay = replayDaily(day, events);
  const scores = [
    {
      display_name: "Typer",
      score: replay.score,
      wpm: replay.metrics.wpm,
      accuracy: replay.metrics.accuracy,
      best_combo: replay.session.bestCombo,
    },
  ];
  const originalFetch = globalThis.fetch;
  let unavailable = false;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    expect(url.origin).toBe("https://example.supabase.co");
    const headers = new Headers(init?.headers);
    expect(headers.get("apikey")).toBe(env.SUPABASE_SERVICE_ROLE_KEY);
    expect(headers.get("authorization")).toBe(
      `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    );
    expect(init?.redirect).toBe("error");
    expect(init?.signal).toBeTruthy();
    const path = url.pathname.replace("/rest/v1/", "");
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({
      path: path + url.search,
      method: init?.method ?? "GET",
      body,
    });
    if (unavailable)
      return new Response("private database detail", { status: 500 });
    if (path === "rpc/begin_daily") return Response.json([run]);
    if (path === "daily_runs") return Response.json([run]);
    if (path === "rpc/complete_daily") {
      run.used = true;
      return new Response(null, { status: 204 });
    }
    expect(path).toBe("daily_scores");
    expect(url.searchParams.get("rules_version")).toBe(
      `eq.${dailyRulesVersion}`,
    );
    expect(url.searchParams.get("limit")).toBe("50");
    return Response.json(scores);
  };
  const call = (body: object) =>
    handleDaily(
      new Request("https://h2otype.test/api/daily", {
        method: "POST",
        body: JSON.stringify({ rulesVersion: dailyRulesVersion, ...body }),
      }),
      env,
      undefined,
      now,
    );
  try {
    expect(await (await call({ action: "begin", day })).json()).toEqual({ id });
    expect(calls[0]).toEqual({
      path: "rpc/begin_daily",
      method: "POST",
      body: { p_day: day, p_rules_version: dailyRulesVersion },
    });
    const submission = {
      action: "submit",
      id,
      player,
      name: " Typer ",
      events,
      score: 999999,
    };
    const response = await call(submission);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ scores });
    expect(
      calls.find((item) => item.path === "rpc/complete_daily")?.body,
    ).toEqual({
      p_id: id,
      p_player: player,
      p_name: "Typer",
      p_score: replay.score,
      p_wpm: replay.metrics.wpm,
      p_accuracy: replay.metrics.accuracy,
      p_combo: replay.session.bestCombo,
    });
    expect((await call(submission)).status).toBe(200);
    expect(
      calls.filter((item) => item.path === "rpc/complete_daily"),
    ).toHaveLength(1);
    expect(
      (
        await call({
          ...submission,
          player: "cccccccc-cccc-4ccc-accc-cccccccccccc",
        })
      ).status,
    ).toBe(409);
    const count = calls.length;
    expect((await call({ action: "list", day, rulesVersion: 3 })).status).toBe(
      409,
    );
    expect(calls).toHaveLength(count);
    unavailable = true;
    const failed = await call({ action: "list", day });
    expect(failed.status).toBe(503);
    const message = await failed.text();
    expect(message).toContain("local score is saved");
    expect(message).not.toContain("private database detail");
    expect(message).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Daily waits until first typing before requesting a shared run, including after restart", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-20T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-20T12:00:01Z"));
  let begins = 0;
  await page.route("**/api/daily", async (route) => {
    if (route.request().postDataJSON().action === "begin") begins++;
    await route.fulfill({
      json: { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await page.clock.fastForward(660000);
  expect(begins).toBe(0);
  const started = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/daily") &&
      response.request().postDataJSON().action === "begin",
  );
  await page.getByRole("textbox").fill("a");
  await started;
  expect(begins).toBe(1);
  await page.keyboard.press("Tab");
  await page.clock.fastForward(660000);
  expect(begins).toBe(1);
  const restarted = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/daily") &&
      response.request().postDataJSON().action === "begin",
  );
  await page.getByRole("textbox").fill("b");
  await restarted;
  expect(begins).toBe(2);
});
