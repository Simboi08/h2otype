import { useEffect, useRef, useState } from "react";
import {
  advanceClock,
  editSession,
  emptySession,
  getMetrics,
  getWordInput,
} from "./typingEngine";

import LiveStats from "./LiveStats";
import { usePracticeKeyboard } from "./usePracticeKeyboard";
import { useTypingFeedback } from "./useTypingFeedback";
import { commitProgress } from "./progressStore";
import TypingPassage from "./TypingPassage";
import SprintResults from "./SprintResults";
import { sprintDurations } from "./sprintRecords";
import type { SprintDuration } from "./sprintRecords";

const passages = {
  sprint:
    "slow down and notice the little things. the light across your desk, the quiet of the morning, the space between one thought and the next.",
  zen: "there is no hurry to get anywhere. let each word lead to the next, like a path winding softly through the trees on a quiet afternoon.",
};

export default function TypingPractice({
  mode,
  duration,
  onDurationChange,
}: {
  mode: "sprint" | "zen";
  duration: SprintDuration;
  onDurationChange: (duration: SprintDuration) => void;
}) {
  // A fixed long passage supplies well over a normal minute of typing.
  const passage =
    mode === "sprint"
      ? Array(24).fill(passages.sprint).join(" ")
      : passages.zen;
  const durationMs = mode === "sprint" ? duration * 1000 : null;
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
    reset: resetFeedback,
    layer: particleLayer,
  } = useTypingFeedback(!finished);
  const { prefix, word } = getWordInput(session.typed);
  usePracticeKeyboard({ restart, composing, input, enabled: !finished });

  useEffect(() => {
    if (session.startedAt === null || finished) return;
    const tick = () => {
      const now = performance.now();
      const next = advanceClock(latest.current, now, durationMs);
      latest.current = next;
      setSession(next);
    };
    const interval = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [session.startedAt, finished, durationMs]);

  function edit(value: string, now: number) {
    const current = latest.current;
    const next = editSession(current, prefix + value, passage, now, durationMs);
    emitFeedback(current, next, passage);
    latest.current = next;
    setSession(next);
    if (next.xpEarned > current.xpEarned)
      commitProgress(next.xpEarned - current.xpEarned);
  }

  function restart() {
    resetFeedback();
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
      {particleLayer}
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
          <span>Zen · single passage</span>
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
      {finished && mode === "sprint" ? (
        <SprintResults
          duration={duration}
          metrics={metrics}
          xpEarned={session.xpEarned}
          onRestart={restart}
        />
      ) : (
        <>
          <TypingPassage
            passage={passage}
            typed={session.typed}
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
            <p id="typing-hint" role="status">
              {finished
                ? "Finished."
                : session.startedAt === null
                  ? "Space advances · Tab restarts"
                  : focused
                    ? "Space advances · Tab restarts"
                    : "Type to continue · Timer running"}
            </p>
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
  );
}
