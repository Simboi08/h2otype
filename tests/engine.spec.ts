import { expect, test } from "@playwright/test";
import {
  advanceClock,
  editSession,
  emptySession,
  getMetrics,
} from "../src/typingEngine";

test("idle input and deletion do not start time; first character does", () => {
  const idle = editSession(emptySession(), "", "hello", 100, 30_000);
  expect(idle.startedAt).toBeNull();
  expect(advanceClock(idle, 50_000, 30_000)).toEqual(idle);
  expect(editSession(idle, "h", "hello", 200, 30_000).startedAt).toBe(200);
});

test("WPM uses correct retained characters and a five-character word", () => {
  const typed = editSession(
    emptySession(),
    "hello worlx",
    "hello world!",
    100,
    null,
  );
  const metrics = getMetrics(advanceClock(typed, 60_100, null), "hello world!");
  expect(metrics).toEqual({
    elapsedMs: 60_000,
    correctCharacters: 10,
    errors: 1,
    wpm: 2,
    accuracy: 91,
  });
});

test("correction does not erase mistakes or inflate retained-character WPM", () => {
  let state = editSession(emptySession(), "hx", "hello", 100, null);
  state = editSession(state, "h", "hello", 200, null);
  state = editSession(state, "he", "hello", 300, null);
  expect(getMetrics(state, "hello").accuracy).toBe(67);
  expect(getMetrics(state, "hello").errors).toBe(1);
  expect(getMetrics(state, "hello").correctCharacters).toBe(2);
  state = editSession(state, "", "hello", 400, null);
  expect(state.startedAt).toBe(100);
  expect(getMetrics(state, "hello").correctCharacters).toBe(0);
});

test("deadline rejects late input even if no timer callback ran", () => {
  const state = editSession(emptySession(), "h", "hello", 100, 30_000);
  const late = editSession(state, "he", "hello", 30_100, 30_000);
  expect(late.typed).toBe("h");
  expect(late.endedAt).toBe(30_100);
  expect(
    getMetrics(advanceClock(late, 999_999, 30_000), "hello").elapsedMs,
  ).toBe(30_000);
});

test("passage completion freezes time and input", () => {
  const complete = editSession(emptySession(), "hello", "hello", 100, null);
  expect(complete.endedAt).toBe(100);
  expect(editSession(complete, "", "hello", 200, null)).toEqual(complete);
  expect(advanceClock(complete, 10_000, null)).toEqual(complete);
  expect(getMetrics(complete, "hello").wpm).toBe(0);
});

test("mid-string replacement, newlines, and overflow are rejected", () => {
  const state = editSession(emptySession(), "he", "hello", 100, null);
  for (const value of ["xe", "he\n", "hello!"]) {
    expect(editSession(state, value, "hello", 200, null).typed).toBe("he");
  }
  expect(getMetrics(emptySession(), "hello")).toMatchObject({
    accuracy: 100,
    wpm: 0,
    elapsedMs: 0,
  });
});

test("untimed sessions have no artificial deadline; restart has no old counts", () => {
  const state = editSession(emptySession(), "h", "hello", 100, null);
  expect(advanceClock(state, 1_000_000, null).endedAt).toBeNull();
  expect(emptySession()).toMatchObject({
    typed: "",
    attempts: 0,
    correctAttempts: 0,
    startedAt: null,
    endedAt: null,
  });
});

test("a non-BMP input character occupies one position and one attempt", () => {
  const state = editSession(emptySession(), "🙂e", "hello", 100, null);
  expect(state.attempts).toBe(2);
  expect(getMetrics(state, "hello")).toMatchObject({
    errors: 1,
    correctCharacters: 1,
    accuracy: 50,
  });
});
