import { expect, test } from "@playwright/test";
import { getTypingFeedback } from "../src/typingFeedback";
import { createSoundSamples } from "../src/typingSound";
import { editSession, emptySession } from "../src/typingEngine";
import { createZen, editZen } from "../src/zenEngine";

test("feedback follows accepted attempts, including corrections, but ignores deletion and expired input", () => {
  const initial = emptySession();
  const correct = editSession(initial, "s", "slow", 0, 1000);
  expect(getTypingFeedback(initial, correct, "slow")).toEqual({
    accepted: true,
    correctIndex: 0,
  });
  const wrong = editSession(correct, "sx", "slow", 100, 1000);
  expect(getTypingFeedback(correct, wrong, "slow")).toEqual({
    accepted: true,
    correctIndex: null,
  });
  const deleted = editSession(correct, "", "slow", 200, 1000);
  expect(getTypingFeedback(correct, deleted, "slow")).toEqual({
    accepted: false,
    correctIndex: null,
  });
  const retyped = editSession(deleted, "s", "slow", 300, 1000);
  expect(retyped.xpEarned).toBe(correct.xpEarned);
  expect(getTypingFeedback(deleted, retyped, "slow").correctIndex).toBe(0);
  const late = editSession(correct, "sl", "slow", 2000, 1000);
  expect(getTypingFeedback(correct, late, "slow").accepted).toBe(false);
  const unicode = editSession(initial, "🌊", "🌊a", 0, null);
  expect(getTypingFeedback(initial, unicode, "🌊a").correctIndex).toBe(0);
});

test("correct-letter anchors remain aligned when Zen retires old words", () => {
  let state = createZen();
  for (let index = 0; index < 1000; index++) {
    const next = editZen(
      state,
      state.session.typed + state.passage[[...state.session.typed].length],
      index,
    );
    if (next.session.typed.length < state.session.typed.length) {
      expect(
        getTypingFeedback(state.session, next.session, next.passage),
      ).toEqual({
        accepted: true,
        correctIndex: [...next.session.typed].length - 1,
      });
      return;
    }
    state = next;
  }
  throw new Error("Expected Zen history retirement");
});

test("standard and bitcrushed sounds have distinct, finite, quiet envelopes", () => {
  const standard = createSoundSamples("standard", 48000);
  const bitcrush = createSoundSamples("bitcrush", 48000);
  expect(standard.length).toBe(1680);
  expect(bitcrush.length).toBe(4560);
  for (const samples of [standard, bitcrush]) {
    expect(Math.abs(samples[0])).toBe(0);
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.000001);
    expect(
      samples.every((value) => Number.isFinite(value) && Math.abs(value) < 0.9),
    ).toBe(true);
    expect(samples.some((value) => Math.abs(value) > 0.1)).toBe(true);
  }
  expect([...standard.slice(0, 100)]).not.toEqual([...bitcrush.slice(0, 100)]);
});
