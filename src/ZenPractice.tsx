import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import { freshSeed } from "./wordBank";
import type { WordSet } from "./wordBank";
import RewardSummary from "./RewardSummary";
import { useCompletionSound } from "./useCompletionSound";
import LiveStats from "./LiveStats";
import { usePracticeKeyboard } from "./usePracticeKeyboard";
import { useTypingFeedback } from "./useTypingFeedback";
import TypingPassage from "./TypingPassage";
import { getWordInput } from "./typingEngine";
import {
  createZen,
  editZen,
  pauseZen,
  resumeZen,
  zenMetrics,
} from "./zenEngine";
import type { ZenState } from "./zenEngine";
import { loadZen, saveZen } from "./zenStorage";

export type ZenHandle = { changeWordSet: (set: WordSet) => void };
export default function ZenPractice({
  wordSet,
  ref,
}: {
  wordSet: WordSet;
  ref?: Ref<ZenHandle>;
}) {
  const [initial] = useState(() => loadZen(wordSet));
  const [state, setState] = useState(initial.state);
  const latest = useRef(initial.state);
  const [now, setNow] = useState(0);
  const [storageAvailable, setStorageAvailable] = useState(
    initial.storageAvailable,
  );
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const composing = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusInput = useRef(false);
  const { prefix, word } = getWordInput(state.session.typed);
  useImperativeHandle(ref, () => ({ changeWordSet: (set) => newSession(set) }));
  const metrics = zenMetrics(state, now);
  const stopped = state.paused || state.summary;
  const {
    container: feedbackRef,
    onEdit: emitFeedback,
    reset: resetFeedback,
    layer: particleLayer,
    comboMeter,
    vignetteLayer,
  } = useTypingFeedback(!stopped);
  useCompletionSound(state.summary && state.session.attempts > 0);
  usePracticeKeyboard({
    restart: newSession,
    composing,
    input,
    enabled: !stopped,
  });

  function update(next: ZenState, timestamp: number) {
    latest.current = next;
    setState(next);
    setNow(timestamp);
    // Persist every accepted edit with its XP; autosaves also capture active time.
    setStorageAvailable(saveZen(next, timestamp));
  }

  useEffect(() => {
    const tick = () => setNow(performance.now());
    const autosave = () =>
      setStorageAvailable(saveZen(latest.current, performance.now()));
    const stop = () => {
      const timestamp = performance.now();
      const next = pauseZen(latest.current, timestamp);
      latest.current = next;
      setState(next);
      setNow(timestamp);
      setDraft(null);
      composing.current = false;
      setStorageAvailable(saveZen(next, timestamp));
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    const clock = window.setInterval(tick, 250);
    const save = window.setInterval(autosave, 5000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", stop);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(save);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", stop);
      saveZen(latest.current, performance.now());
    };
  }, []);

  useEffect(() => {
    if (stopped) heading.current?.focus({ preventScroll: true });
  }, [stopped, state.summary]);

  function edit(value: string, timestamp: number) {
    const before = latest.current;
    const next = editZen(before, prefix + value, timestamp);
    emitFeedback(before.session, next.session, next.passage);
    update(next, timestamp);
  }

  function stop(summary: boolean) {
    const timestamp = performance.now();
    setDraft(null);
    composing.current = false;
    update(pauseZen(latest.current, timestamp, summary), timestamp);
  }

  function resume() {
    const timestamp = performance.now();
    focusInput.current = true;
    update(resumeZen(latest.current, timestamp), timestamp);
  }

  function newSession(set: WordSet = wordSet) {
    resetFeedback();
    const timestamp = performance.now();
    focusInput.current = true;
    setDraft(null);
    composing.current = false;
    update(createZen(set, freshSeed()), timestamp);
    input.current?.focus({ preventScroll: true });
  }

  return (
    <div className="passage-card" ref={feedbackRef}>
      {particleLayer}
      {vignetteLayer}
      <div className="practice-surface">
        <div className="passage-meta">
          <span>Zen</span>
          {!stopped && (
            <LiveStats
              key={state.session.startedAt ?? "idle"}
              wpm={metrics.wpm}
              accuracy={metrics.accuracy}
              elapsedMs={metrics.elapsedMs}
            />
          )}
          <span role="timer" aria-label="Active time">
            {Math.floor(metrics.elapsedMs / 1000)}s elapsed
          </span>
        </div>
        {stopped ? (
          <section
            className="sprint-results"
            aria-labelledby="zen-title"
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.target === heading.current) {
                event.preventDefault();
                resume();
              }
            }}
          >
            <h2
              id="zen-title"
              tabIndex={-1}
              ref={heading}
              aria-keyshortcuts="Tab Enter"
            >
              {state.summary ? "Zen session" : "Zen paused"}
            </h2>
            <dl className="result-grid">
              <div>
                <dt>WPM</dt>
                <dd>{metrics.wpm}</dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd>{metrics.accuracy}%</dd>
              </div>
              <div>
                <dt>Errors</dt>
                <dd>{metrics.errors}</dd>
              </div>
              <div>
                <dt>Characters</dt>
                <dd>{metrics.correctCharacters}</dd>
              </div>
            </dl>
            <RewardSummary session={state.session} zen />
            <div className="results-footer">
              <p>Active time only. Enter resumes · Tab starts a new session.</p>
              <div className="zen-actions">
                <button className="restart-button" onClick={() => newSession()}>
                  New session
                </button>
                <button className="restart-button" onClick={resume}>
                  Resume
                </button>
              </div>
            </div>
          </section>
        ) : (
          <>
            <TypingPassage
              passage={state.passage}
              typed={state.session.typed}
              focused={focused}
              finished={false}
            />
            <p id="zen-passage" className="sr-only">
              Passage from current word:{" "}
              {state.passage.slice(prefix.length, prefix.length + 180)}
            </p>
            <label htmlFor="zen-input" className="sr-only">
              Type the passage
            </label>
            <input
              id="zen-input"
              className="typing-input"
              ref={(node) => {
                input.current = node;
                if (node && focusInput.current) {
                  focusInput.current = false;
                  node.focus({ preventScroll: true });
                }
              }}
              value={draft ?? word}
              placeholder="Type here"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby="zen-hint zen-passage"
              aria-keyshortcuts="Tab"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onPaste={(event) => event.preventDefault()}
              onDrop={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.repeat && event.key.length === 1)
                  event.preventDefault();
                if (event.key === "Escape") {
                  event.preventDefault();
                  stop(false);
                }
                if (
                  event.key === "Backspace" &&
                  !composing.current &&
                  !word &&
                  prefix
                ) {
                  event.preventDefault();
                  const timestamp = performance.now();
                  const next = editZen(
                    latest.current,
                    latest.current.session.typed.slice(0, -1),
                    timestamp,
                  );
                  emitFeedback(
                    latest.current.session,
                    next.session,
                    next.passage,
                  );
                  update(next, timestamp);
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
                setDraft(event.currentTarget.value);
              }}
              onCompositionEnd={(event) => {
                composing.current = false;
                setDraft(null);
                edit(event.currentTarget.value, performance.now());
              }}
              onChange={(event) => {
                if (composing.current) setDraft(event.currentTarget.value);
                else edit(event.currentTarget.value, performance.now());
              }}
            />
            <div className="practice-footer">
              <div className="practice-status">
                {comboMeter}
                <p id="zen-hint" className={comboMeter ? "sr-only" : undefined}>
                  Tab restarts · Esc pauses
                </p>
              </div>
              <div className="zen-actions">
                <button className="restart-button" onClick={() => stop(false)}>
                  Pause
                </button>
                <button className="restart-button" onClick={() => stop(true)}>
                  Finish
                </button>
              </div>
            </div>
          </>
        )}
        {!storageAvailable && (
          <p className="storage-note" role="status">
            Browser storage is unavailable. Keep this page open to retain your
            session.
          </p>
        )}
      </div>
    </div>
  );
}
