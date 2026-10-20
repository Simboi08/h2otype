import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { recordSprint } from "./sprintRecords";
import type { SprintDuration } from "./sprintRecords";
import type { Session, getMetrics } from "./typingEngine";
import type { WordSet } from "./wordBank";
import { wordSets } from "./wordBank";
import RewardSummary from "./RewardSummary";
import { dailyScore } from "./dailyChallenge";
import type { DailyChallenge, DailyEvent } from "./dailyChallenge";
import { recordDaily } from "./dailyRecords";
import DailyPublicationStatus from "./DailyPublicationStatus";
import { useDailyPublishing } from "./dailyPublishingContext";
import type { DailyRun } from "./dailyLeaderboard";

type Props = {
  duration: SprintDuration;
  metrics: ReturnType<typeof getMetrics>;
  onRestart: () => void;
  session: Session;
  wordSet: WordSet;
  challenge?: DailyChallenge;
  events: RefObject<DailyEvent[]>;
  dailyRun: RefObject<Promise<DailyRun | null> | null>;
};
export default function SprintResults({
  duration,
  metrics,
  onRestart,
  session,
  wordSet,
  challenge,
  events,
  dailyRun,
}: Props) {
  const { store: publishing } = useDailyPublishing();
  const heading = useRef<HTMLHeadingElement>(null);
  const recorded = useRef(false);
  const [id] = useState(() => crypto.randomUUID());
  const [record, setRecord] = useState<ReturnType<typeof recordSprint> | null>(
    null,
  );
  const [daily, setDaily] = useState<ReturnType<typeof recordDaily> | null>(
    null,
  );
  const { elapsedMs, correctCharacters, wpm, accuracy, errors } = metrics;
  const eligible = elapsedMs >= duration * 1000 && correctCharacters > 0;
  const entry = {
    id,
    day: challenge?.day ?? "",
    score: dailyScore(session),
    wpm,
    accuracy,
    combo: session.bestCombo,
  };
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    if (challenge) {
      if (eligible) {
        const result = recordDaily({
          id,
          day: challenge.day,
          score: dailyScore(session),
          wpm,
          accuracy,
          combo: session.bestCombo,
        });
        queueMicrotask(() => setDaily(result));
        publishing.offer(
          {
            id,
            day: challenge.day,
            score: dailyScore(session),
            wpm,
            accuracy,
            combo: session.bestCombo,
          },
          events.current,
          dailyRun.current,
        );
      }
    } else {
      const result = recordSprint(
        duration,
        { wpm, accuracy },
        eligible,
        wordSet,
      );
      queueMicrotask(() => setRecord(result));
    }
    heading.current?.focus({ preventScroll: true });
  }, [
    duration,
    wpm,
    accuracy,
    eligible,
    wordSet,
    challenge,
    session,
    id,
    publishing,
    events,
    dailyRun,
  ]);
  return (
    <section
      className={`sprint-results results-updated ${challenge ? "daily-results" : ""}`}
      aria-labelledby="results-title"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === heading.current) {
          event.preventDefault();
          onRestart();
        }
      }}
    >
      <div className="results-heading">
        <h2
          id="results-title"
          data-daily-run={challenge ? id : undefined}
          tabIndex={-1}
          ref={heading}
          aria-keyshortcuts="Tab Enter"
        >
          {challenge ? "Daily results" : "Sprint results"}
        </h2>
        <p className="results-context">
          {challenge
            ? `${challenge.day} · 15s · English 100`
            : `${wordSets.find((set) => set.id === wordSet)!.label} · ${duration}s`}
        </p>
      </div>
      {challenge && (
        <p className="daily-score">
          <span>Score</span>
          <strong data-testid="daily-score">
            {entry.score.toLocaleString()}
          </strong>
          <small>10 points per new correct character + combo bonuses</small>
        </p>
      )}
      <dl className="result-grid">
        <div className="result-primary">
          <dt>WPM</dt>
          <dd data-testid="result-wpm">{wpm}</dd>
        </div>
        <div className="result-primary">
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
      <RewardSummary session={session} />
      <div className="record-summary" role="status">
        {challenge ? (
          <p>
            {daily?.previousBest
              ? `Previous best · ${daily.previousBest.score.toLocaleString()} pts`
              : "Your first daily score today"}
            {daily &&
            (!daily.previousBest || entry.score > daily.previousBest.score)
              ? " · New best"
              : ""}
          </p>
        ) : record?.best ? (
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
            Complete the full timer with at least one correct character to save{" "}
            {challenge ? "a daily score" : "a best"}.
          </p>
        )}
        {((record && !record.available) || (daily && !daily.available)) && (
          <p>Browser storage is unavailable. This result cannot be saved.</p>
        )}
      </div>
      <div className="results-footer">
        <p>Errors include corrected mistakes. Tab or Enter to restart.</p>
        <div className="results-actions">
          {challenge && <DailyPublicationStatus entry={entry} />}
          <button className="restart-button" onClick={onRestart}>
            Restart
          </button>
        </div>
      </div>
    </section>
  );
}
