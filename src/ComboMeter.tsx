import { comboThresholds, getCombo } from "./combo";

export default function ComboMeter({
  streak,
  fraction = 0,
}: {
  streak: number;
  fraction?: number;
}) {
  const { tier, next, percent, multiplier } = getCombo(streak, fraction);
  // Each section is one upgrade. Crossing a threshold carries progress forward
  // instead of resetting the fill or competing with a second animation.
  const progress = next
    ? ((tier + percent / 100) / comboThresholds.length) * 100
    : 100;
  if (streak <= 0) return null;
  return (
    <div
      className="combo-meter"
      data-tier={tier}
      title="Each filled section unlocks the next XP multiplier. Typing replenishes combo; higher tiers drain faster."
    >
      <div className="combo-heading">
        <strong>{tier ? `${multiplier.toFixed(1)}× XP` : "Build combo"}</strong>
        <span>
          {next ? `Next ${getCombo(next).multiplier.toFixed(1)}×` : "MAX"}
        </span>
      </div>
      <div
        className="combo-track"
        role="meter"
        aria-label="Typing combo"
        aria-valuemin={0}
        aria-valuemax={comboThresholds[4]}
        aria-valuenow={Math.min(streak, comboThresholds[4])}
        aria-valuetext={`${streak} combo charge; combo tier ${tier}; ${multiplier.toFixed(1)} times XP${next ? `; next tier at ${next}` : "; maximum tier"}`}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
