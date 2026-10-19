import { useEffect } from "react";
import { usePreferences } from "./preferences";
import { getLevel } from "./progression";
import { dismissLevelNotice, useProgress } from "./progressStore";
import { useReducedMotion } from "./useReducedMotion";
import { useXpMotion } from "./useXpMotion";
import { graphicsProfiles } from "./graphics";

export default function ProgressIndicator() {
  const progress = useProgress();
  const { preferences } = usePreferences();
  const reducedMotion = useReducedMotion();
  const fill = useXpMotion(
    progress.totalXp,
    reducedMotion ? 0 : graphicsProfiles[preferences.graphicsTier].xpDuration,
    preferences.xpProgress,
  );
  useEffect(() => {
    if (!preferences.levelNotifications) dismissLevelNotice();
  }, [preferences.levelNotifications]);
  const { level, current, required } = getLevel(progress.totalXp);
  if (
    !preferences.xpProgress &&
    !(preferences.levelNotifications && progress.notice !== null) &&
    progress.storageAvailable
  )
    return null;
  return (
    <div
      className={`progress-hud ${progress.notice !== null && preferences.levelNotifications ? "has-level-up" : ""}`}
    >
      {preferences.xpProgress && (
        <div
          className="level-indicator"
          title={`Level ${level} · ${current}/${required} XP · ${progress.totalXp} total XP${progress.storageAvailable ? "" : " · Not saved"}`}
        >
          <div className="xp-heading">
            <span className="level-badge">
              Level <strong>{String(level).padStart(2, "0")}</strong>
            </span>
            <span className="xp-value">
              {current} <span>/ {required} XP</span>
            </span>
          </div>
          <div
            className="xp-track"
            role="progressbar"
            aria-label="Level XP"
            aria-valuemin={0}
            aria-valuemax={required}
            aria-valuenow={current}
            aria-valuetext={`${current} of ${required} XP toward level ${level + 1}; ${progress.totalXp} total XP`}
          >
            <span ref={fill} className="xp-fill" />
          </div>
          <div className="xp-caption">
            <span>{progress.totalXp.toLocaleString()} total XP</span>
            <span>Next · Level {level + 1}</span>
          </div>
        </div>
      )}
      <div className="progress-notice" role="status">
        {preferences.levelNotifications && progress.notice !== null ? (
          <div className="level-up-banner" key={progress.notice}>
            <span className="level-up-label">Level up</span>
            <strong>Level {progress.notice}</strong>
          </div>
        ) : null}
      </div>
      {!progress.storageAvailable && (
        <span className="progress-unsaved" role="status">
          XP not saved
        </span>
      )}
    </div>
  );
}
