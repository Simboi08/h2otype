import { useDailyPublishing } from "./dailyPublishingContext";
import type { DailyRecord } from "./dailyRecords";
export default function DailyPublicationStatus({
  entry,
}: {
  entry: DailyRecord;
}) {
  const { store, state } = useDailyPublishing();
  const current = state.attempts[entry.day];
  const attempt = current?.entry.id === entry.id ? current : undefined;
  return (
    <div className="daily-publication">
      <button
        className="restart-button"
        aria-haspopup="dialog"
        onClick={() => store.open(entry.day, false)}
      >
        Daily rankings
      </button>
      {attempt && (
        <p className="publication-message" role="status">
          {attempt.status === "checking"
            ? "Checking online run…"
            : attempt.status === "sending"
              ? "Updating your Daily best…"
              : attempt.status === "sent"
                ? `Daily best saved${state.guest.best?.day === entry.day && state.guest.rank ? ` · Rank #${state.guest.rank}` : ""}.`
                : attempt.status === "error"
                  ? attempt.token
                    ? "Submission failed. Score saved locally."
                    : attempt.error?.includes("not connected")
                      ? "Shared rankings are not connected yet."
                      : "Online run unavailable. Score saved locally."
                  : "Daily best ready to submit."}
        </p>
      )}
      {attempt?.status === "error" && attempt.token && (
        <button
          className="restart-button"
          onClick={() => store.retry(entry.day)}
        >
          Retry submission
        </button>
      )}
    </div>
  );
}
