import { useState } from "react";
import { usePreferences } from "./preferences";

function SampledWpm({
  wpm,
  elapsedMs,
  refreshMs,
}: {
  wpm: number;
  elapsedMs: number;
  refreshMs: number;
}) {
  const bucket = Math.floor(elapsedMs / refreshMs);
  const [sample, setSample] = useState({ bucket, wpm });
  // Sample on active-time boundaries, independent of typing frequency.
  // The clock still runs normally; only this displayed number is held steady.
  if (sample.bucket !== bucket) setSample({ bucket, wpm });
  return <dd>{sample.wpm}</dd>;
}

export default function LiveStats({
  wpm,
  accuracy,
  elapsedMs,
}: {
  wpm: number;
  accuracy: number;
  elapsedMs: number;
}) {
  const { preferences } = usePreferences();
  if (!preferences.liveWpm && !preferences.liveAccuracy) return null;
  return (
    <dl className="live-stats" aria-label="Live statistics" aria-live="off">
      {preferences.liveWpm && (
        <div style={{ fontSize: `${preferences.wpmScale / 100}em` }}>
          <dt>WPM</dt>
          {preferences.wpmRefreshMs === 0 ? (
            <dd>{wpm}</dd>
          ) : (
            <SampledWpm
              key={preferences.wpmRefreshMs}
              wpm={wpm}
              elapsedMs={elapsedMs}
              refreshMs={preferences.wpmRefreshMs}
            />
          )}
        </div>
      )}
      {preferences.liveAccuracy && (
        <div style={{ fontSize: `${preferences.accuracyScale / 100}em` }}>
          <dt>Accuracy</dt>
          <dd>{accuracy}%</dd>
        </div>
      )}
    </dl>
  );
}
