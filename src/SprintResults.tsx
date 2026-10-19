import { useEffect, useRef, useState } from "react";
import { recordSprint } from "./sprintRecords";
import type { SprintDuration } from "./sprintRecords";
import type { getMetrics } from "./typingEngine";

type Props = {
  duration: SprintDuration;
  metrics: ReturnType<typeof getMetrics>;
  onRestart: () => void;
  xpEarned: number;
};

export default function SprintResults({
  duration,
  metrics,
  onRestart,
  xpEarned,
}: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const recorded = useRef(false);
  const [record, setRecord] = useState<ReturnType<typeof recordSprint> | null>(
    null,
  );
  const { elapsedMs, correctCharacters, wpm, accuracy, errors } = metrics;
  const eligible = elapsedMs >= duration * 1000 && correctCharacters > 0;

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    setRecord(recordSprint(duration, { wpm, accuracy }, eligible));
    heading.current?.focus({ preventScroll: true });
  }, [duration, wpm, accuracy, eligible]);

  return (
    <section
      className="sprint-results"
      aria-labelledby="results-title"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === heading.current) {
          event.preventDefault();
          onRestart();
        }
      }}
    >
      <h2
        id="results-title"
        tabIndex={-1}
        ref={heading}
        aria-keyshortcuts="Tab Enter"
      >
        Sprint results
      </h2>
      <dl className="result-grid">
        <div>
          <dt>WPM</dt>
          <dd data-testid="result-wpm">{wpm}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{accuracy}%</dd>
        </div>
        <div>
          <dt>Errors</dt>
          <dd>{errors}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>
            {(elapsedMs / 1000).toFixed(1)}
            <small>s</small>
          </dd>
        </div>
      </dl>
      <p className="session-xp">+{xpEarned} XP this run</p>
      <div className="record-summary" role="status">
        {record?.best ? (
          <p>
            {record.newBest ? "New best" : "Personal best"} · {duration}s:{" "}
            <strong>{record.best.wpm} WPM</strong> · {record.best.accuracy}%
            accuracy
          </p>
        ) : (
          <p>No personal best for {duration}s yet.</p>
        )}
        {!eligible && (
          <p>
            Complete the full timer with at least one correct character to save
            a best.
          </p>
        )}
        {record && !record.available && (
          <p>Browser storage is unavailable. This result cannot be saved.</p>
        )}
      </div>
      <div className="results-footer">
        <p>Errors include corrected mistakes. Tab or Enter to restart.</p>
        <button className="restart-button" onClick={onRestart}>
          Restart
        </button>
      </div>
    </section>
  );
}
