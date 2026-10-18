import { useEffect, useRef, useState } from "react";
import LiveStats from "./LiveStats";
import { restartOnTab } from "./restartShortcut";
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

type Props = {
  exitRequested: boolean;
  onExit: () => void;
  onCancelExit: () => void;
};

export default function ZenPractice({
  exitRequested,
  onExit,
  onCancelExit,
}: Props) {
  const [initial] = useState(loadZen);
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
  const metrics = zenMetrics(state, now);
  const stopped = state.paused || state.summary;

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
    if (exitRequested) {
      const timestamp = performance.now();
      const next = pauseZen(latest.current, timestamp, true);
      latest.current = next;
      setState(next);
      setNow(timestamp);
      setDraft(null);
      composing.current = false;
      setStorageAvailable(saveZen(next, timestamp));
    }
  }, [exitRequested]);

  useEffect(() => {
    if (stopped) heading.current?.focus({ preventScroll: true });
  }, [stopped, state.summary, exitRequested]);

  function edit(value: string, timestamp: number) {
    update(editZen(latest.current, prefix + value, timestamp), timestamp);
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
    onCancelExit();
    update(resumeZen(latest.current, timestamp), timestamp);
  }

  function newSession() {
    const timestamp = performance.now();
    focusInput.current = true;
    setDraft(null);
    composing.current = false;
    onCancelExit();
    update(createZen(), timestamp);
    input.current?.focus({ preventScroll: true });
  }

  return (
    <div className="passage-card">
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
            onKeyDown={(event) => restartOnTab(event, newSession)}
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
          <p className="session-xp">
            +{state.session.xpEarned} XP this session
          </p>
          <div className="results-footer">
            <p>Active time only. Enter resumes · Tab starts a new session.</p>
            <div className="zen-actions">
              {exitRequested && (
                <button className="restart-button" onClick={onExit}>
                  Go to Sprint
                </button>
              )}
              <button className="restart-button" onClick={newSession}>
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
              restartOnTab(event, newSession, composing.current);
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
                update(
                  editZen(
                    latest.current,
                    latest.current.session.typed.slice(0, -1),
                    timestamp,
                  ),
                  timestamp,
                );
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
            <p id="zen-hint">Tab restarts · Esc pauses</p>
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
  );
}
