import { expect, test } from "@playwright/test";
import {
  createZen,
  editZen,
  parseZen,
  pauseZen,
  resumeZen,
  zenMetrics,
} from "../src/zenEngine";

test("Zen replenishes before the boundary and bounds retained text without losing totals", () => {
  let state = createZen();
  let total = 0;
  for (let index = 0; index < 60; index++) {
    total += state.passage.length - state.session.typed.length;
    state = editZen(state, state.passage, index * 1000);
    expect(state.session.endedAt).toBeNull();
    expect(state.session.typed.length).toBeLessThanOrEqual(600);
    expect(state.passage.length).toBeLessThan(1200);
    expect(
      state.passage.length - state.session.typed.length,
    ).toBeGreaterThanOrEqual(200);
  }
  expect(state.bankedCorrect).toBeGreaterThan(0);
  expect(zenMetrics(state, 60_000)).toMatchObject({
    correctCharacters: total,
    accuracy: 100,
    errors: 0,
  });
});

test("pause/resume counts active time only and paused input is ignored", () => {
  let state = editZen(createZen(), "there", 1000);
  state = pauseZen(state, 11_000);
  expect(zenMetrics(state, 90_000).elapsedMs).toBe(10_000);
  expect(editZen(state, "there ", 100_000)).toEqual(state);
  state = resumeZen(state, 100_000);
  expect(zenMetrics(state, 105_000).elapsedMs).toBe(15_000);
  state = pauseZen(state, 106_000, true);
  expect(state.summary).toBe(true);
  expect(zenMetrics(state, 1_000_000).elapsedMs).toBe(16_000);
});

test("idle pause does not start timing; a new session clears all progress", () => {
  const idle = resumeZen(pauseZen(createZen(), 1000), 10_000);
  expect(zenMetrics(idle, 90_000).elapsedMs).toBe(0);
  expect(createZen()).toMatchObject({
    bankedCorrect: 0,
    elapsedMs: 0,
    runningSince: null,
  });
});

test("corrections keep error history, including after history is banked", () => {
  let state = editZen(createZen(), "x", 1000);
  state = editZen(state, "", 2000);
  state = editZen(state, state.passage, 3000);
  state = editZen(state, state.passage, 4000);
  state = editZen(state, state.passage, 5000);
  expect(state.bankedCorrect).toBeGreaterThan(0);
  expect(zenMetrics(state, 10_000).errors).toBe(1);
  const metrics = zenMetrics(state, 10_000);
  state = editZen(state, state.session.typed.slice(0, -1), 11_000);
  expect(zenMetrics(state, 11_000).correctCharacters).toBe(
    metrics.correctCharacters - 1,
  );
});

test("saved sessions restore paused without reusing page timestamps", () => {
  let state = editZen(createZen(), "there", 1000);
  state = pauseZen(state, 6000);
  const restored = parseZen(JSON.stringify({ version: 1, state }));
  expect(restored).not.toBeNull();
  expect(restored!.paused).toBe(true);
  expect(restored!.runningSince).toBeNull();
  expect(zenMetrics(restored!, 900_000)).toMatchObject({
    elapsedMs: 5000,
    correctCharacters: 5,
  });
  expect(zenMetrics(resumeZen(restored!, 100), 1100).elapsedMs).toBe(6000);
});

test("corrupt and inconsistent snapshots are rejected", () => {
  expect(parseZen("{broken")).toBeNull();
  expect(
    parseZen(JSON.stringify({ version: 2, state: createZen() })),
  ).toBeNull();
  const state = editZen(createZen(), "there", 100);
  for (const invalid of [
    { ...state, elapsedMs: -1 },
    { ...state, passage: "" },
    { ...state, batch: 99 },
    { ...state, bankedCorrect: 1000 },
    { ...state, session: { ...state.session, correctAttempts: 999 } },
  ]) {
    expect(parseZen(JSON.stringify({ version: 1, state: invalid }))).toBeNull();
  }
});

test("non-BMP input preserves character alignment through trimming", () => {
  let state = createZen();
  const text = "🙂" + state.passage.slice(1);
  state = editZen(state, text, 1000);
  for (let index = 0; index < 3; index++)
    state = editZen(
      state,
      state.session.typed +
        state.passage.slice([...state.session.typed].length),
      2000 + index,
    );
  expect(zenMetrics(state, 10_000).errors).toBe(1);
  expect(
    parseZen(JSON.stringify({ version: 1, state: pauseZen(state, 10_000) })),
  ).not.toBeNull();
});
