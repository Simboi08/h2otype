import { useRef, useState } from "react";
import type { RefObject } from "react";
import type { DailyRecord } from "./dailyRecords";
import type { DailyEvent } from "./dailyChallenge";
import { dailyRequest, sharedRankings } from "./dailyLeaderboard";
import type { RankedScore } from "./dailyLeaderboard";
import { trapDialogFocus } from "./dialogFocus";

export default function DailyRankings({
  entry,
  records,
  eligible,
  events,
  run,
}: {
  entry: DailyRecord;
  records: DailyRecord[];
  eligible: boolean;
  events: RefObject<DailyEvent[]>;
  run: RefObject<Promise<string | null> | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [global, setGlobal] = useState<RankedScore[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  async function open() {
    dialog.current?.showModal();
    if (!sharedRankings) return;
    setBusy(true);
    setMessage("");
    try {
      setGlobal(
        (await dailyRequest({ action: "list", day: entry.day })).scores,
      );
    } catch {
      setMessage(
        "Shared rankings are unavailable. Your local scores are below.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (busy || sent || !eligible || !name.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const id = await run.current;
      if (!id)
        throw new Error(
          "This run could not connect. Play again to submit; your local score is saved.",
        );
      let player = "";
      try {
        player = localStorage.getItem("h2otype.daily-player.v1") ?? "";
      } catch {
        /* A per-visit guest remains usable. */
      }
      if (!/^[0-9a-f-]{36}$/.test(player)) player = crypto.randomUUID();
      try {
        localStorage.setItem("h2otype.daily-player.v1", player);
      } catch {
        /* No persistence required to submit. */
      }
      const result = await dailyRequest({
        action: "submit",
        id,
        player,
        name: name.trim(),
        events: events.current,
      });
      setGlobal(result.scores);
      setSent(true);
      setMessage("Score submitted. Your best score today counts.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not submit. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="restart-button"
        aria-haspopup="dialog"
        onClick={() => void open()}
      >
        Daily rankings
      </button>
      <dialog
        className="settings-dialog daily-rankings"
        ref={dialog}
        aria-labelledby="rankings-title"
        onKeyDown={trapDialogFocus}
        onClose={() =>
          document
            .querySelector<HTMLElement>("#results-title")
            ?.focus({ preventScroll: true })
        }
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
          {entry.day} · 15 seconds · English 100 · resets at midnight UTC
        </p>
        {sharedRankings && (
          <>
            <h3>Guest leaderboard</h3>
            {global.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {global.map((score, index) => (
                    <tr key={index}>
                      <td>
                        {index > 0 &&
                        score.score === global[index - 1].score &&
                        score.accuracy === global[index - 1].accuracy &&
                        score.wpm === global[index - 1].wpm
                          ? "="
                          : index + 1}
                      </td>
                      <td>{score.display_name}</td>
                      <td>{score.score.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="settings-note">
                {busy ? "Loading rankings…" : "No submitted scores yet."}
              </p>
            )}
            {eligible && !sent && (
              <form
                className="daily-submit"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
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
                />
                <button
                  className="restart-button"
                  disabled={busy || !name.trim()}
                >
                  Submit score
                </button>
              </form>
            )}
          </>
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
                    score.id === entry.id ? "current-score" : undefined
                  }
                >
                  <td>
                    {index + 1}
                    {score.id === entry.id ? " · this run" : ""}
                  </td>
                  <td>{score.score.toLocaleString()}</td>
                  <td>{score.wpm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="settings-note">Finish the full test to save a score.</p>
        )}
        <p className="settings-note">
          Ranked by score, then accuracy, then WPM. Combo bonuses increase
          points. Only your best submitted run per day enters the guest
          leaderboard.
        </p>
        <p role="status">{message}</p>
      </dialog>
    </>
  );
}
