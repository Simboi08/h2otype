import { comboThresholds, getCombo } from "./combo";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { usePreferences } from "./preferences";

export default function ComboMeter({
  streak,
  fraction = 0,
}: {
  streak: number;
  fraction?: number;
}) {
  const { tier, next, percent, multiplier } = getCombo(streak, fraction);
  const fill = useRef<HTMLSpanElement>(null);
  const previousTier = useRef(0);
  const reduced = useReducedMotion();
  const { preferences } = usePreferences();
  const animated =
    !reduced &&
    preferences.effectIntensity > 0 &&
    preferences.graphicsTier !== "low";
  useEffect(() => {
    // Finish the old stage visibly before revealing progress in the new one.
    // This is cosmetic only: earned rewards and accessible labels stay exact.
    const animation =
      tier > previousTier.current && animated
        ? fill.current?.animate(
            [
              { width: "100%" },
              { width: "100%", offset: 0.6 },
              { width: fill.current?.style.width ?? "0%" },
            ],
            { duration: 180, easing: "linear" },
          )
        : undefined;
    previousTier.current = tier;
    return () => animation?.cancel();
  }, [tier, animated]); // Progress ticks must not cancel an upgrade's full-bar acknowledgement.
  return (
    <div
      className="combo-meter"
      data-tier={tier}
      title="Typing replenishes combo. Higher tiers drain faster; new correct positions earn bonus XP."
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
        <span key={tier} ref={fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
