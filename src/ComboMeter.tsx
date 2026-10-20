import { comboThresholds, getCombo } from "./combo";

export default function ComboMeter({
  streak,
  fraction = 0,
}: {
  streak: number;
  fraction?: number;
}) {
  const { tier, next, percent, multiplier } = getCombo(streak, fraction);
  if (!tier) return null;
  return (
    <div
      className="combo-meter"
      data-tier={tier}
      title="Typing replenishes combo. Higher tiers drain faster; new correct positions earn bonus XP."
    >
      <div className="combo-heading">
        <strong>Combo ×{tier}</strong>
        <span>
          {streak} · {multiplier.toFixed(1)}× XP
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
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
