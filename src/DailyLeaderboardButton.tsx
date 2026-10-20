import { useDailyPublishing } from "./dailyPublishingContext";
export default function DailyLeaderboardButton() {
  const { store, state } = useDailyPublishing();
  const rank =
    state.guest.best?.day === state.today ? state.guest.rank : undefined;
  return (
    <button
      className="leaderboard-button"
      aria-label="Open daily leaderboard"
      aria-haspopup="dialog"
      onClick={() => store.open()}
      title={
        rank
          ? `Daily leaderboard · Your rank #${rank.toLocaleString()}`
          : "Daily leaderboard"
      }
      data-ranked={Boolean(rank)}
    >
      <span className="leaderboard-label">Leaderboard</span>
      {rank ? (
        <span className="leaderboard-compact" aria-hidden="true">
          Ranks
        </span>
      ) : null}
      {rank ? (
        <strong>
          {" "}
          · #<span className="rank-full">{rank.toLocaleString()}</span>
          <span className="rank-compact" aria-hidden="true">
            {new Intl.NumberFormat("en", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(rank)}
          </span>
        </strong>
      ) : null}
    </button>
  );
}
