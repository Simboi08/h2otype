import { comboThresholds, getCombo } from "./combo";
import { createPortal } from "react-dom";
import { useComboMotion } from "./useComboMotion";

export default function ComboMeter({
  streak,
  fraction = 0,
  earned = 0,
  stage = 0,
  epoch = 0,
}: {
  streak: number;
  fraction?: number;
  earned?: number;
  stage?: number;
  epoch?: number;
}) {
  const { tier, multiplier } = getCombo(streak, fraction);
  const next = comboThresholds[stage] ?? null;
  const { fill, meter, layer, allowed } = useComboMotion(
    streak,
    fraction,
    earned,
    stage,
    epoch,
  );
  if (streak <= 0) return null;
  return (
    <>
      <div
        ref={meter}
        className="combo-meter"
        data-tier={tier}
        data-stage={stage}
        title={`Fill the whole bar for the next combo stage${next ? ` at ${next} charge` : "; maximum stage reached"}. The XP rate follows current charge.`}
      >
        <div className="combo-heading">
          <strong>{stage ? `Combo ${stage}` : "Build combo"}</strong>
          <span>{multiplier.toFixed(1)}× XP</span>
        </div>
        <div
          className="combo-track"
          role="meter"
          aria-label="Typing combo"
          aria-valuemin={0}
          aria-valuemax={comboThresholds[4]}
          aria-valuenow={Math.min(streak, comboThresholds[4])}
          aria-valuetext={`${streak} combo charge; earned stage ${stage}; current reward tier ${tier}; ${multiplier.toFixed(1)} times XP${next ? `; next earned stage at ${next}` : "; maximum earned stage"}`}
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
