import { getCombo } from "./combo";

export default function ComboMeter({ streak }: { streak: number }) {
  const { tier, next, percent } = getCombo(streak);
  if (!tier) return null;
  return (
    <div
      className="combo-meter"
      data-tier={tier}
      title="Correct-typing streak. Feedback only; XP stays the same."
    >
      <div className="combo-heading">
        <strong>Combo ×{tier}</strong>
        <span>
          {streak} correct{tier >= 4 ? " · Peak combo" : ""}
        </span>
      </div>
      <div
        className="combo-track"
        role="meter"
        aria-label="Typing combo"
        aria-valuemin={0}
        aria-valuemax={next ?? streak}
        aria-valuenow={streak}
        aria-valuetext={`${streak} correct characters in a row; combo tier ${tier}${next ? `; next tier at ${next}` : "; maximum tier"}`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
