import { expect, test } from "@playwright/test";
import { editSession, emptySession } from "../src/typingEngine";
import {
  createZen,
  editZen,
  parseZen,
  pauseZen,
  resumeZen,
} from "../src/zenEngine";
import {
  createDaily,
  dailyDay,
  dailyEdit,
  dailyScore,
  replayDaily,
} from "../src/dailyChallenge";
import { compareDaily, parseDailyRecords } from "../src/dailyRecords";
import { createCompletionSamples } from "../src/typingSound";
import { handleDaily } from "../server/dailyApi";
import type { DailyDatabase } from "../server/dailyApi";

for (const [characters, bonus] of [
  [24, 0],
  [25, 0],
  [29, 1],
  [59, 7],
  [60, 7],
  [100, 27],
  [120, 38],
  [200, 118],
  [350, 344],
]) {
  test(`${characters} perfect characters earn ${characters} base and ${bonus} combo XP`, () => {
    const state = editSession(
      emptySession(),
      "a".repeat(characters),
      "a".repeat(500),
      0,
      null,
    );
    expect(state).toMatchObject({
      baseXp: characters,
      xpEarned: characters + bonus,
      streak: characters,
      bestCombo: characters,
    });
    expect(Math.floor(state.bonusTenths / 10)).toBe(bonus);
  });
}
test("fractional bonuses, mixed commits and correction replay obey fresh-position credits", () => {
  let state = editSession(
    emptySession(),
    "a".repeat(28),
    "a".repeat(500),
    0,
    null,
  );
  expect(state.bonusTenths).toBe(8);
  state = editSession(state, "a".repeat(29), "a".repeat(500), 1, null);
  expect(state.xpEarned).toBe(30);
  state = editSession(state, "", "a".repeat(500), 2, null);
  expect(state.streak).toBe(0);
  state = editSession(state, "a".repeat(29), "a".repeat(500), 3, null);
  expect(state.streak).toBe(0);
  expect(state.xpEarned).toBe(30);
  state = editSession(state, state.typed + "xaa", "a".repeat(500), 4, null);
  expect(state).toMatchObject({
    streak: 2,
    bestCombo: 29,
    baseXp: 31,
    bonusTenths: 10,
  });
});

test("Zen restores base, fractional bonus, best combo, and replay protection without resuming a streak", () => {
  let state = createZen("english100", 12345);
  state = editZen(state, state.passage.slice(0, 115), 0);
  const restored = parseZen(
    JSON.stringify({ version: 1, state: pauseZen(state, 1000) }),
  )!;
  expect(restored.session).toMatchObject({
    baseXp: 115,
    xpEarned: 150,
    bonusTenths: 350,
    bestCombo: 115,
    streak: 0,
  });
  let active = resumeZen(restored, 2000);
  active = editZen(active, active.session.typed.slice(0, -1), 2100);
  active = editZen(active, restored.session.typed, 2200);
  expect(active.session.xpEarned).toBe(150);
  expect(active.session.bonusTenths).toBe(350);
  for (const broken of [
    { bonusTenths: -1 },
    { bonusTenths: 9000 },
    { baseXp: 9999 },
    { xpEarned: 9999 },
    { streak: 9999 },
  ]) {
    expect(
      parseZen(
        JSON.stringify({
          version: 1,
          state: { ...state, session: { ...state.session, ...broken } },
        }),
      ),
    ).toBeNull();
  }
  const old = { ...state.session } as Partial<typeof state.session>;
  delete old.baseXp;
  delete old.bonusTenths;
  delete old.bestCombo;
  delete old.streak;
  old.xpEarned = 115;
  const migrated = parseZen(
    JSON.stringify({ version: 1, state: { ...state, session: old } }),
  )!;
  expect(migrated.session).toMatchObject({
    baseXp: 115,
    xpEarned: 115,
    bonusTenths: 0,
    streak: 0,
  });
});

test("Daily is shared by UTC date, uses a stable passage, and scores fresh credits with combo points", () => {
  expect(dailyDay(new Date("2026-10-19T23:59:59-04:00"))).toBe("2026-10-20");
  const daily = createDaily("2026-10-19");
  expect(createDaily("2026-10-19")).toEqual(daily);
  expect(createDaily("2026-10-20").passage).not.toBe(daily.passage);
  const first = editSession(
    emptySession(),
    daily.passage.slice(0, 100),
    daily.passage,
    0,
    15000,
  );
  expect(dailyScore(first)).toBe(1275);
  const event = dailyEdit(emptySession(), first)!;
  expect(replayDaily(daily.day, [event])).toMatchObject({
    score: 1275,
    session: { xpEarned: 127 },
    metrics: { wpm: 80, accuracy: 100 },
  });
  expect(
    replayDaily(daily.day, [
      event,
      { at: 2000, remove: 1 },
      { at: 3000, add: first.typed.at(-1)! },
    ]).score,
  ).toBe(1275);
  for (const events of [
    [],
    [{ at: 15000, add: "a" }],
    [{ at: -1, add: "a" }],
    [{ at: 0, add: "a", remove: 1 }],
    [event, { at: 1, remove: 1000 }],
    [event, { at: 20, reset: true }, { at: 10, reset: true }],
  ])
    expect(() => replayDaily(daily.day, events)).toThrow();
});

test("Daily record validation and ranking prefer score, then accuracy, then WPM", () => {
  const entry = {
    id: "run",
    day: "2026-10-19",
    score: 1000,
    wpm: 80,
    accuracy: 99,
    combo: 50,
  };
  expect(
    parseDailyRecords(
      JSON.stringify({
        version: 1,
        records: [entry, { ...entry, score: -1 }, { ...entry, accuracy: 101 }],
      }),
    ),
  ).toEqual([entry]);
  expect(
    compareDaily(entry, { ...entry, score: 1001, wpm: 1 }),
  ).toBeGreaterThan(0);
  expect(
    compareDaily(entry, { ...entry, accuracy: 100, wpm: 1 }),
  ).toBeGreaterThan(0);
  expect(compareDaily(entry, { ...entry, wpm: 81 })).toBeGreaterThan(0);
});

test("finish phrases have finite bounded envelopes, distinct styles and a silent ending", () => {
  for (const sampleRate of [22050, 48000]) {
    const standard = createCompletionSamples("standard", sampleRate);
    const bitcrush = createCompletionSamples("bitcrush", sampleRate);
    expect(standard.length).toBe(Math.round(sampleRate * 0.6));
    expect(standard).not.toEqual(bitcrush);
    for (const samples of [standard, bitcrush]) {
      expect(
        samples.every(
          (sample) => Number.isFinite(sample) && Math.abs(sample) <= 0.5,
        ),
      ).toBe(true);
      expect(samples[0]).toBe(0);
      expect(Math.abs(samples.at(-1)!)).toBeLessThan(0.001);
    }
  }
});

test("shared ranking server replays scores, rejects malformed or premature runs, and handles missing backend", async () => {
  const day = "2026-10-19";
  const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const player = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
  const now = Date.parse(day + "T12:00:00Z");
  const records: Record<string, unknown>[] = [];
  const run = {
    id,
    day,
    started_at: new Date(now - 60000).toISOString(),
    used: false,
    rules_version: 5,
    player_id: player,
  };
  const db: DailyDatabase = {
    begin: async () => run,
    run: async () => run,
    list: async () => records,
    complete: async (record) => {
      records.push(record);
      run.used = true;
    },
  };
  const call = (body: unknown, database: DailyDatabase | undefined = db) =>
    handleDaily(
      new Request("https://h2otype.test/api/daily", {
        method: "POST",
        body: JSON.stringify({
          rulesVersion: 5,
          ...(body as Record<string, unknown>),
        }),
      }),
      {},
      database,
      now,
    );
  expect((await call({ action: "begin", day })).status).toBe(200);
  expect((await call({ action: "begin", day, rulesVersion: 1 })).status).toBe(
    409,
  );
  expect((await call({ action: "begin", day: "2026-10-18" })).status).toBe(400);
  const events = [{ at: 0, add: createDaily(day).passage.slice(0, 100) }];
  const submission = {
    action: "submit",
    id,
    player,
    name: "Typer",
    events,
    score: 999999,
  };
  run.rules_version = 1;
  expect((await call(submission)).status).toBe(409);
  run.rules_version = 5;
  run.started_at = new Date(now - 1000).toISOString();
  expect((await call(submission)).status).toBe(409);
  run.started_at = new Date(now - 60000).toISOString();
  expect(
    (await call({ ...submission, events: [{ at: -1, add: "a" }] })).status,
  ).toBe(400);
  expect((await call({ ...submission, name: "<script>" })).status).toBe(400);
  expect((await call(submission)).status).toBe(200);
  expect(records[0]).toMatchObject({
    p_score: 1275,
    p_wpm: 80,
    p_accuracy: 100,
    p_combo: 100,
  });
  expect((await call(submission)).status).toBe(200);
  expect(records).toHaveLength(1);
  const missing = await handleDaily(
    new Request("https://h2otype.test/api/daily", {
      method: "POST",
      body: "{}",
    }),
    {},
  );
  expect(missing.status).toBe(503);
  const crossOrigin = await handleDaily(
    new Request("https://h2otype.test/api/daily", {
      method: "POST",
      headers: { origin: "https://elsewhere.test" },
      body: "{}",
    }),
    {},
    db,
    now,
  );
  expect(crossOrigin.status).toBe(403);
});

test("Daily replay handles a Unicode mistake and its deletion using character positions", () => {
  const daily = createDaily("2026-10-19");
  const replay = replayDaily(daily.day, [
    { at: 0, add: "🙂" },
    { at: 1000, remove: 1 },
    { at: 2000, add: daily.passage.slice(0, 100) },
  ]);
  expect(replay.score).toBe(1275);
  expect(replay.metrics.errors).toBe(1);
  expect(replay.metrics.accuracy).toBe(99);
});
