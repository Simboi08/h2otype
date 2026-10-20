import { useEffect, useRef, useState } from "react";
import { sharedRankings } from "./dailyLeaderboard";
import { useDailyPublishing } from "./dailyPublishingContext";
import { trapDialogFocus } from "./dialogFocus";

export default function DailyRankings() {
  const { store, state } = useDailyPublishing();
  const dialog = useRef<HTMLDialogElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  const [name, setName] = useState(state.guest.name);
  const day = state.selectedDay;
  const attempt = day ? state.attempts[day] : undefined;
  const records = day ? store.localRecords(day) : [];
  useEffect(() => {
    if (day && !dialog.current?.open) {
      restore.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.current?.showModal();
      dialog.current
        ?.querySelector<HTMLInputElement>("#daily-name:not(:disabled)")
        ?.focus();
    } else if (!day && dialog.current?.open) dialog.current.close();
    if (!day) return;
    const refresh = setInterval(() => {
      if (!document.hidden) void store.refresh();
    }, 30000);
    return () => clearInterval(refresh);
  }, [day, store]);
  const publicationMessage =
    attempt?.status === "sent"
      ? "Score submitted. Your best score today counts; better runs update automatically."
      : (attempt?.error ?? "");
  // Starting a run and loading its rankings can fail for the same reason.
  const status = publicationMessage.includes(state.message)
    ? publicationMessage
    : [publicationMessage, state.message].filter(Boolean).join(" ");
  return (
    <dialog
      className="settings-dialog daily-rankings"
      ref={dialog}
      aria-labelledby="rankings-title"
      onKeyDown={trapDialogFocus}
      onClose={() => {
        store.close();
        const target =
          document.querySelector<HTMLElement>(
            "#results-title, #zen-title, .typing-input:not([readonly])",
          ) ?? (restore.current?.isConnected ? restore.current : null);
        target?.focus({ preventScroll: true });
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
        )
          dialog.current?.close();
      }}
    >
      <div className="dialog-heading">
        <h2 id="rankings-title">Daily rankings</h2>
        <button
          className="close-button"
          aria-label="Close rankings"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <p className="settings-note">
        {day} · 15 seconds · English 100 · resets at midnight UTC
      </p>
      {sharedRankings ? (
        <>
          <h3>Guest leaderboard</h3>
          {state.standing && (
            <p className="your-standing">
              Your rank <strong>#{state.standing.rank}</strong> ·{" "}
              {state.standing.score.toLocaleString()} points
            </p>
          )}
          {attempt && attempt.status !== "sent" && attempt.token && (
            <form
              className="daily-submit"
              onSubmit={(event) => {
                event.preventDefault();
                void store.confirm(name);
              }}
            >
              <p className="settings-note">
                {state.guest.acceptedDay === day
                  ? "Update your daily best."
                  : "Submit your Daily best?"}{" "}
                Once submitted, better runs update your entry automatically
                until midnight UTC.
              </p>
              <label htmlFor="daily-name">
                Display name <small>Visible to other players</small>
              </label>
              <input
                id="daily-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={1}
                maxLength={20}
                autoComplete="nickname"
                required
                disabled={attempt.status === "sending"}
              />
              <button
                className="restart-button"
                disabled={attempt.status === "sending" || !name.trim()}
              >
                {attempt.status === "sending" ? "Submitting…" : "Submit score"}
              </button>
              <button
                className="restart-button"
                type="button"
                disabled={attempt.status === "sending"}
                onClick={() => dialog.current?.close()}
              >
                Not now
              </button>
            </form>
          )}
          {state.scores.length ? (
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {state.scores.map((score, index) => {
                  const rank =
                    state.scores.findIndex(
                      (other) =>
                        other.score === score.score &&
                        other.accuracy === score.accuracy &&
                        other.wpm === score.wpm,
                    ) + 1;
                  return (
                    <tr
                      key={index}
                      className={score.is_you ? "current-score" : undefined}
                    >
                      <td>{rank}</td>
                      <td>
                        {score.display_name}
                        {score.is_you ? " · you" : ""}
                      </td>
                      <td>{score.score.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="settings-note">
              {state.loading
                ? "Loading rankings…"
                : state.message
                  ? "Shared rankings could not load."
                  : "No submitted scores yet. Play Daily to join."}
            </p>
          )}
          <button
            className="restart-button"
            disabled={state.loading}
            onClick={() => void store.refresh()}
          >
            Refresh rankings
          </button>
        </>
      ) : (
        <p className="settings-note">
          Shared rankings are not enabled on this deployment. Local scores are
          below.
        </p>
      )}
      <h3>Scores on this browser</h3>
      {records.length ? (
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Score</th>
              <th>WPM</th>
            </tr>
          </thead>
          <tbody>
            {records.map((score, index) => (
              <tr
                key={score.id}
                className={
                  score.id === attempt?.entry.id ? "current-score" : undefined
                }
              >
                <td>{index + 1}</td>
                <td>{score.score.toLocaleString()}</td>
                <td>{score.wpm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="settings-note">
          Finish the full Daily test to save a score.
        </p>
      )}
      <p className="settings-note">
        Ranked by score, then accuracy, then WPM. Only your best submitted run
        per day enters the guest leaderboard.
      </p>
      {!state.storageAvailable && (
        <p className="settings-storage-note">
          Your name and guest identity can only be kept for this visit because
          browser storage is unavailable.
        </p>
      )}
      <p role="status">{status}</p>
    </dialog>
  );
}
