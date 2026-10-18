import { useEffect, useRef, useState } from "react";
import {
  advanceClock,
  editSession,
  emptySession,
  getMetrics,
  getWordInput,
} from "./typingEngine";

const passages = {
  sprint:
    "slow down and notice the little things. the light across your desk, the quiet of the morning, the space between one thought and the next.",
  zen: "there is no hurry to get anywhere. let each word lead to the next, like a path winding softly through the trees on a quiet afternoon.",
};

export default function TypingPractice({ mode }: { mode: "sprint" | "zen" }) {
  const passage = passages[mode];
  const durationMs = mode === "sprint" ? 30_000 : null;
  const [session, setSession] = useState(emptySession);
  const [focused, setFocused] = useState(false);
  const [compositionDraft, setCompositionDraft] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<HTMLSpanElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const metrics = getMetrics(session, passage);
  const finished = session.endedAt !== null;
  const typedCharacters = [...session.typed];
  const { prefix, word } = getWordInput(session.typed);

  useEffect(() => {
    if (session.startedAt === null || finished) return;
    const tick = () => {
      const now = performance.now();
      setSession((current) => advanceClock(current, now, durationMs));
    };
    const interval = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [session.startedAt, finished, durationMs]);

  useEffect(() => {
    const active = caret.current;
    const container = windowRef.current;
    if (!active || !container) return;
    const bounds = container.getBoundingClientRect();
    const target = active.getBoundingClientRect();
    if (target.bottom > bounds.bottom)
      container.scrollTop += target.bottom - bounds.bottom + 12;
    if (target.top < bounds.top)
      container.scrollTop -= bounds.top - target.top + 12;
  }, [session.typed.length]);

  function edit(value: string) {
    const now = performance.now();
    setSession((current) =>
      editSession(current, prefix + value, passage, now, durationMs),
    );
  }

  function restart() {
    setSession(emptySession());
    setCompositionDraft(null);
    composing.current = false;
    if (windowRef.current) windowRef.current.scrollTop = 0;
    input.current?.focus();
  }

  let position = 0;
  return (
    <div className="passage-card">
      <div className="passage-meta">
        <span>{mode === "sprint" ? "Sprint" : "Zen · single passage"}</span>
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
      <div
        className={`passage-window ${focused ? "is-focused" : ""}`}
        ref={windowRef}
      >
        <p className="passage" aria-hidden="true">
          {passage.split(/( )/).map((word, wordIndex) => (
            <span className="passage-word" key={wordIndex}>
              {[...word].map((char) => {
                const index = position++;
                const status =
                  index < typedCharacters.length
                    ? typedCharacters[index] === char
                      ? "correct"
                      : "incorrect"
                    : "pending";
                return (
                  <span
                    key={index}
                    className={`character ${status} ${index === typedCharacters.length && !finished ? "current" : ""}`}
                    ref={index === typedCharacters.length ? caret : undefined}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          ))}
        </p>
      </div>
      <p className="sr-only" id="passage-text">
        Passage: {passage}
      </p>
      <label className="sr-only" htmlFor="typing-input">
        Type the passage
      </label>
      <input
        id="typing-input"
        ref={input}
        className="typing-input"
        value={finished ? "" : (compositionDraft ?? word)}
        placeholder="Type here"
        readOnly={finished}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-describedby="typing-hint passage-text"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPaste={(event) => event.preventDefault()}
        onDrop={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.repeat && event.key.length === 1) event.preventDefault();
          if (
            event.key === "Backspace" &&
            !composing.current &&
            !finished &&
            word === "" &&
            prefix
          ) {
            event.preventDefault();
            const now = performance.now();
            setSession((current) =>
              editSession(
                current,
                current.typed.slice(0, -1),
                passage,
                now,
                durationMs,
              ),
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
          setCompositionDraft(event.currentTarget.value);
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          setCompositionDraft(null);
          edit(event.currentTarget.value);
        }}
        onChange={(event) => {
          if (composing.current) setCompositionDraft(event.currentTarget.value);
          else edit(event.currentTarget.value);
        }}
      />
      <div className="passage-footer practice-footer">
        <p id="typing-hint" role="status">
          {finished
            ? "Finished."
            : session.startedAt === null
              ? "Space advances · Backspace corrects"
              : focused
                ? "Space advances · Backspace corrects"
                : "Click the field to continue · Timer running"}
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
    </div>
  );
}
