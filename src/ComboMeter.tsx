import { comboThresholds, getCombo } from "./combo";
import { createPortal } from "react-dom";
import { useComboMotion } from "./useComboMotion";

export default function ComboMeter({
  streak,
  fraction = 0,
  earned = 0,
}: {
  streak: number;
  fraction?: number;
  earned?: number;
}) {
  const { tier, next, multiplier } = getCombo(streak, fraction);
  const { fill, meter, layer, allowed } = useComboMotion(
    streak,
    fraction,
    earned,
  );
  if (streak <= 0) return null;
  return (
    <>
      <div
        ref={meter}
        className="combo-meter"
        data-tier={tier}
        title="Fill the whole bar to unlock the next XP multiplier. Typing replenishes combo; higher tiers drain faster."
      >
        <div className="combo-heading">
          <strong>
            {tier ? `${multiplier.toFixed(1)}× XP` : "Build combo"}
          </strong>
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
          <span ref={fill} />
        </div>
      </div>
      {allowed
        ? createPortal(
            <div
              className="combo-meter-particles"
              ref={layer}
              aria-hidden="true"
            />,
            document.body,
          )
        : null}
    </>
  );
}
