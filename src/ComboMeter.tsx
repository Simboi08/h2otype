import { getCombo } from "./combo";

export default function ComboMeter({ streak }: { streak: number }) {
  const { tier, next, percent, multiplier } = getCombo(streak);
  if (!tier) return null;
  return (
    <div
      className="combo-meter"
      data-tier={tier}
      title="Correct-typing streak. New correct positions earn bonus XP."
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
        aria-valuemax={next ?? streak}
        aria-valuenow={streak}
        aria-valuetext={`${streak} correct characters in a row; combo tier ${tier}; ${multiplier.toFixed(1)} times XP${next ? `; next tier at ${next}` : "; maximum tier"}`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
