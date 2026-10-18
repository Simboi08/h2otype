import { usePreferences } from "./preferences";

export default function LiveStats({
  wpm,
  accuracy,
}: {
  wpm: number;
  accuracy: number;
}) {
  const { preferences } = usePreferences();
  if (!preferences.liveWpm && !preferences.liveAccuracy) return null;
  return (
    <dl className="live-stats" aria-label="Live statistics" aria-live="off">
      {preferences.liveWpm && (
        <div>
          <dt>WPM</dt>
          <dd>{wpm}</dd>
        </div>
      )}
      {preferences.liveAccuracy && (
        <div>
          <dt>Accuracy</dt>
          <dd>{accuracy}%</dd>
        </div>
      )}
    </dl>
  );
}
