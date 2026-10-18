import { useEffect } from "react";
import { usePreferences } from "./preferences";
import { getLevel } from "./progression";
import { dismissLevelNotice, useProgress } from "./progressStore";

export default function ProgressIndicator() {
  const progress = useProgress();
  const { preferences } = usePreferences();
  useEffect(() => {
    if (!preferences.levelNotifications) dismissLevelNotice();
  }, [preferences.levelNotifications]);
  const { level, current, required, percent } = getLevel(progress.totalXp);
  return (
    <>
      {preferences.xpProgress && (
        <div
          className="level-indicator"
          title={`Level ${level} · ${current}/${required} XP · ${progress.totalXp} total XP${progress.storageAvailable ? "" : " · Not saved"}`}
        >
          <span>Level {level}</span>
          <div
            className="xp-track"
            role="progressbar"
            aria-label="Level XP"
            aria-valuemin={0}
            aria-valuemax={required}
            aria-valuenow={current}
            aria-valuetext={`${current} of ${required} XP toward level ${level + 1}; ${progress.totalXp} total XP`}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
      <div className="progress-notice" role="status">
        {preferences.levelNotifications && progress.notice !== null
          ? `Level ${progress.notice}`
          : ""}
      </div>
      {!progress.storageAvailable && (
        <span className="progress-unsaved" role="status">
          XP not saved
        </span>
      )}
    </>
  );
}
