import { useEffect, useRef, useState } from "react";
import {
  advanceClock,
  editSession,
  emptySession,
  getMetrics,
  getWordInput,
} from "./typingEngine";

import { useFinishCelebration } from "./useFinishCelebration";
import { useCompletionSound } from "./useCompletionSound";
import { beginDaily } from "./dailyLeaderboard";
import { createDaily, dailyEdit, dailyDuration } from "./dailyChallenge";
import type { DailyEvent } from "./dailyChallenge";
import LiveStats from "./LiveStats";
import { usePracticeKeyboard } from "./usePracticeKeyboard";
import { useTypingFeedback } from "./useTypingFeedback";
import { commitProgress } from "./progressStore";
import TypingPassage from "./TypingPassage";
import SprintResults from "./SprintResults";
import { sprintDurations } from "./sprintRecords";
import type { SprintDuration } from "./sprintRecords";
import { freshSeed, generateWords } from "./wordBank";
import type { WordSet } from "./wordBank";
import { sprintSentence } from "./passages";

export default function TypingPractice({
  mode,
  duration,
  onDurationChange,
  wordSet,
}: {
  mode: "sprint" | "daily";
  duration: SprintDuration;
  onDurationChange: (duration: SprintDuration) => void;
  wordSet: WordSet;
}) {
  // Each generated run gets fresh words, with enough text for a full minute.
  const [challenge, setChallenge] = useState(createDaily);
  const events = useRef<DailyEvent[]>([]);
  const dailyRun = useRef<Promise<string | null> | null>(null);
  const createPassage = () =>
    mode === "daily"
      ? challenge.passage
      : wordSet === "sentences"
        ? Array(24).fill(sprintSentence).join(" ")
        : generateWords(wordSet, freshSeed(), 600).text;
  const [passage, setPassage] = useState(createPassage);
  const durationMs = (mode === "daily" ? dailyDuration : duration) * 1000;
  const [session, setSession] = useState(emptySession);
  const latest = useRef(session);
  const [focused, setFocused] = useState(false);
  const [compositionDraft, setCompositionDraft] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const focusOnAttach = useRef(false);
  const metrics = getMetrics(session, passage);
  const finished = session.endedAt !== null;
  const {
    container: feedbackRef,
    onEdit: emitFeedback,
    onClock: clockFeedback,
    reset: resetFeedback,
    layer: particleLayer,
    comboMeter,
    vignetteLayer,
  } = useTypingFeedback(!finished);
  const { prefix, word } = getWordInput(session.typed);
  useCompletionSound(finished);
  const finishCelebration = useFinishCelebration(finished);
  usePracticeKeyboard({ restart, composing, input, enabled: !finished });

  useEffect(() => {
    if (session.startedAt === null || finished) return;
    const tick = () => {
      const now = performance.now();
      let next = advanceClock(latest.current, now, durationMs);
      if (document.hidden && next.streak) {
        if (mode === "daily" && next.endedAt === null)
          events.current.push({ at: now - next.startedAt!, reset: true });
        next = { ...next, streak: 0, comboDecayFraction: 0 };
      }
      latest.current = next;
      setSession(next);
      clockFeedback(next);
    };
    const interval = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [session.startedAt, finished, durationMs, mode, clockFeedback]);

  function edit(value: string, now: number) {
    const current = latest.current;
    const next = editSession(current, prefix + value, passage, now, durationMs);
    emitFeedback(current, next, passage);
    if (mode === "daily") {
      if (current.startedAt === null && next.startedAt !== null)
        dailyRun.current = beginDaily(challenge.day);
      const event = dailyEdit(current, next);
      if (event) events.current.push(event);
    }
    latest.current = next;
    setSession(next);
    if (next.xpEarned > current.xpEarned)
      commitProgress(next.xpEarned - current.xpEarned);
  }

  function restart() {
    resetFeedback();
    const daily = createDaily();
    setChallenge(daily);
    events.current = [];
    dailyRun.current = null;
    setPassage(mode === "daily" ? daily.passage : createPassage());
    focusOnAttach.current = true;
    const next = emptySession();
    latest.current = next;
    setSession(next);
    setCompositionDraft(null);
    composing.current = false;
    input.current?.focus();
  }

  return (
    <div className="passage-card" ref={feedbackRef}>
      {finishCelebration}
      {particleLayer}
      {vignetteLayer}
      <div className="practice-surface">
        <div className="passage-meta">
          {mode === "sprint" ? (
            <div
              className="duration-switch"
              role="group"
              aria-label="Sprint duration"
            >
              {sprintDurations.map((value) => (
                <button
                  key={value}
                  aria-pressed={duration === value}
                  onClick={() => {
                    if (duration !== value) onDurationChange(value);
                  }}
                >
                  {value}s
                </button>
              ))}
            </div>
          ) : (
            <span className="daily-label">
              Daily · {challenge.day} <small>English 100 · UTC</small>
            </span>
          )}
          {!finished && (
            <LiveStats
              key={session.startedAt ?? "idle"}
              wpm={metrics.wpm}
              accuracy={metrics.accuracy}
              elapsedMs={metrics.elapsedMs}
            />
          )}
          <span
            className="mode-detail"
            role="timer"
            aria-label={durationMs === null ? "Elapsed time" : "Time remaining"}
          >
            {durationMs === null
              ? `${Math.floor(metrics.elapsedMs / 1000)}s elapsed`
              : `${Math.ceil((durationMs - metrics.elapsedMs) / 1000)}s remaining`}
          </span>
        </div>
        {finished ? (
          <SprintResults
            duration={mode === "daily" ? dailyDuration : duration}
            metrics={metrics}
            session={session}
            challenge={mode === "daily" ? challenge : undefined}
            events={events}
            dailyRun={dailyRun}
            wordSet={wordSet}
            onRestart={restart}
          />
        ) : (
          <>
            <TypingPassage
              passage={passage}
              typed={session.typed}
              started={session.startedAt !== null}
              focused={focused}
              finished={finished}
            />
            <p className="sr-only" id="passage-text">
              Passage from current word:{" "}
              {passage.slice(prefix.length, prefix.length + 180)}
            </p>
            <label className="sr-only" htmlFor="typing-input">
              Type the passage
            </label>
            <input
              id="typing-input"
              ref={(node) => {
                input.current = node;
                if (node && focusOnAttach.current) {
                  focusOnAttach.current = false;
                  node.focus({ preventScroll: true });
                }
              }}
              className="typing-input"
              value={finished ? "" : (compositionDraft ?? word)}
              placeholder="Type here"
              readOnly={finished}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby="typing-hint passage-text"
              aria-keyshortcuts="Tab"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onPaste={(event) => event.preventDefault()}
              onDrop={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.repeat && event.key.length === 1)
                  event.preventDefault();
                if (
                  event.key === "Backspace" &&
                  !composing.current &&
                  !finished &&
                  word === "" &&
                  prefix
                ) {
                  event.preventDefault();
                  const now = performance.now();
                  const next = editSession(
                    latest.current,
                    latest.current.typed.slice(0, -1),
                    passage,
                    now,
                    durationMs,
                  );
                  emitFeedback(latest.current, next, passage);
                  if (mode === "daily") {
                    const event = dailyEdit(latest.current, next);
                    if (event) events.current.push(event);
                  }
                  latest.current = next;
                  setSession(next);
                }
              }}
              onSelect={(event) => {
                if (!composing.current)
                  event.currentTarget.setSelectionRange(
                    event.currentTarget.value.length,
                    event.currentTarget.value.length,
                  );
              }}
              onCompositionStart={(event) => {
                composing.current = true;
                setCompositionDraft(event.currentTarget.value);
              }}
              onCompositionEnd={(event) => {
                composing.current = false;
                setCompositionDraft(null);
                edit(event.currentTarget.value, performance.now());
              }}
              onChange={(event) => {
                if (composing.current)
                  setCompositionDraft(event.currentTarget.value);
                else edit(event.currentTarget.value, performance.now());
              }}
            />
            <div className="passage-footer practice-footer">
              <div className="practice-status">
                {comboMeter}
                <p
                  id="typing-hint"
                  role="status"
                  className={comboMeter ? "sr-only" : undefined}
                >
                  {finished
                    ? "Finished."
                    : session.startedAt === null
                      ? "Space advances · Tab restarts"
                      : focused
                        ? "Space advances · Tab restarts"
                        : "Type to continue · Timer running"}
                </p>
              </div>
              <button className="restart-button" onClick={restart}>
                Restart
              </button>
            </div>
            {finished && (
              <p className="session-metrics" role="status">
                {metrics.wpm} WPM <span>·</span> {metrics.accuracy}% accuracy{" "}
                <span>·</span> {metrics.errors} incorrect{" "}
                {metrics.errors === 1 ? "attempt" : "attempts"}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
