import { useEffect, useState } from "react";
import { dailyDay } from "./dailyChallenge";
import {
  compareDaily,
  dailyRecordsChanged,
  dailyRecordsKey,
  loadDailyRecords,
  parseDailyRecords,
} from "./dailyRecords";
import type { DailyRecord } from "./dailyRecords";

export default function DailyStatus({ onPlay }: { onPlay: () => void }) {
  const [status, setStatus] = useState(() => ({
    day: dailyDay(),
    records: loadDailyRecords(),
  }));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshDay = () => {
      const day = dailyDay();
      setStatus((current) =>
        current.day === day ? current : { ...current, day },
      );
      clearTimeout(timer);
      const nextMidnight = Date.parse(`${day}T00:00:00Z`) + 86400000;
      timer = setTimeout(refreshDay, nextMidnight - Date.now() + 25);
    };
    const changed = (event: Event) =>
      setStatus((current) => {
        const day = dailyDay();
        const records = (event as CustomEvent<DailyRecord[]>).detail;
        // Keep the best seen this visit even when browser storage cannot save attempts.
        const previousBest = current.records
          .filter((record) => record.day === day)
          .sort(compareDaily)[0];
        return {
          day,
          records:
            previousBest &&
            !records.some((record) => record.id === previousBest.id)
              ? [...records, previousBest]
              : records,
        };
      });
    const storage = (event: StorageEvent) => {
      if (event.key === dailyRecordsKey || event.key === null)
        setStatus({
          day: dailyDay(),
          records: parseDailyRecords(event.newValue),
        });
    };
    const visible = () => {
      if (!document.hidden) refreshDay();
    };
    refreshDay();
    window.addEventListener(dailyRecordsChanged, changed);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", refreshDay);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(dailyRecordsChanged, changed);
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", refreshDay);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  const best = status.records
    .filter((record) => record.day === status.day)
    .sort(compareDaily)[0];
  const label = best
    ? `Today's Daily best: ${best.score.toLocaleString()} points`
    : "Daily challenge available";
  return (
    <button
      className="daily-status"
      onClick={onPlay}
      aria-label={label}
      title={`${label} · 15s · scores on this browser`}
    >
      <span aria-live="polite">
        {best ? (
          <>
            Daily best · <strong>{best.score.toLocaleString()}</strong>
          </>
        ) : (
          "Daily available"
        )}
      </span>
    </button>
  );
}
