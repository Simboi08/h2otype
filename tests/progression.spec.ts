import { expect, test } from "@playwright/test";
import { editSession, emptySession } from "../src/typingEngine";
import {
  createZen,
  editZen,
  parseZen,
  pauseZen,
  resumeZen,
} from "../src/zenEngine";
import { getLevel, levelThreshold, MAX_XP } from "../src/progression";
import { parseProgress } from "../src/progressStore";

test("XP credits first correct positions, never deletions or repeated corrections", () => {
  let state = editSession(emptySession(), "hx", "hello ", 0, null);
  expect(state.xpEarned).toBe(1);
  state = editSession(state, "h", "hello ", 1, null);
  state = editSession(state, "he", "hello ", 2, null);
  expect(state.xpEarned).toBe(2);
  for (let i = 0; i < 10; i++) {
    state = editSession(state, "", "hello ", 3, null);
    state = editSession(state, "he", "hello ", 4, null);
  }
  expect(state.xpEarned).toBe(2);
  state = editSession(state, "hello ", "hello ", 5, null);
  expect(state.xpEarned).toBe(6);
  expect(state.credited).toEqual([0, 1, 2, 3, 4, 5]);
  expect(editSession(state, "", "hello ", 6, null).xpEarned).toBe(6);
  expect(emptySession().xpEarned).toBe(0);
});

test("incorrect spam, invalid edits, and expired input cannot earn XP", () => {
  const wrong = editSession(emptySession(), "xxxxx", "hello world", 0, 1000);
  expect(wrong.xpEarned).toBe(0);
  expect(editSession(wrong, "hello", "hello world", 1, 1000).xpEarned).toBe(0);
  expect(editSession(wrong, "xxxxx ", "hello world", 1000, 1000).xpEarned).toBe(
    0,
  );
});

test("Unicode character positions and spaces receive one credit each", () => {
  let state = editSession(emptySession(), "🙂 ", "🙂 hi", 0, null);
  expect(state.xpEarned).toBe(2);
  state = editSession(state, "", "🙂 hi", 1, null);
  state = editSession(state, "🙂 ", "🙂 hi", 2, null);
  expect(state.xpEarned).toBe(2);
});

test("level thresholds and bar progress are consistent at every boundary", () => {
  for (const [xp, level, current, required] of [
    [0, 1, 0, 100],
    [99, 1, 99, 100],
    [100, 2, 0, 200],
    [299, 2, 199, 200],
    [300, 3, 0, 300],
    [600, 4, 0, 400],
    [1000, 5, 0, 500],
  ]) {
    expect(getLevel(xp)).toMatchObject({ level, current, required });
  }
  expect(levelThreshold(10)).toBe(4500);
  expect(getLevel(MAX_XP).percent).toBeLessThan(100);
  expect(getLevel(NaN).level).toBe(1);
});

test("Zen retirement and restore retain credit history without replay XP", () => {
  let state = createZen();
  let expected = 0;
  for (let i = 0; i < 12; i++) {
    expected += state.passage.length - state.session.typed.length;
    state = editZen(state, state.passage, i * 1000);
  }
  expect(state.session.xpEarned).toBe(expected);
  expect(state.session.credited.length).toBeLessThanOrEqual(600);
  const restored = resumeZen(
    parseZen(JSON.stringify({ version: 1, state: pauseZen(state, 15000) }))!,
    16000,
  );
  const shortened = editZen(
    restored,
    restored.session.typed.slice(0, -10),
    17000,
  );
  const replay = editZen(shortened, restored.session.typed, 18000);
  expect(replay.session.xpEarned).toBe(expected);
});

test("legacy Zen drafts migrate with zero retroactive XP and retain old credits", () => {
  const state = editZen(createZen(), "there", 100);
  const session = JSON.parse(JSON.stringify(state.session)) as Record<
    string,
    unknown
  >;
  delete session.credited;
  delete session.xpEarned;
  const migrated = parseZen(
    JSON.stringify({ version: 1, state: { ...state, session } }),
  )!;
  expect(migrated.session.xpEarned).toBe(0);
  const active = resumeZen(migrated, 200);
  const shortened = editZen(active, "ther", 300);
  expect(editZen(shortened, "there", 400).session.xpEarned).toBe(0);
  expect(editZen(active, "there ", 500).session.xpEarned).toBe(1);
});

test("profile and credit validation reject invalid balances and malformed ledgers", () => {
  for (const totalXp of [-1, 0.5, "100", MAX_XP + 1])
    expect(
      parseProgress(JSON.stringify({ version: 1, totalXp, zen: null })),
    ).toBeNull();
  expect(parseProgress("{bad")).toBeNull();
  const state = editZen(createZen(), "there", 0);
  for (const credited of [[0, 0], [-1], [99999]])
    expect(
      parseZen(
        JSON.stringify({
          version: 1,
          state: { ...state, session: { ...state.session, credited } },
        }),
      ),
    ).toBeNull();
  expect(
    parseProgress(
      JSON.stringify({ version: 1, totalXp: 200, zen: { bad: true } }),
    ),
  ).toEqual({ totalXp: 200, zen: null });
});
