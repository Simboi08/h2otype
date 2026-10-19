import type { CSSProperties } from "react";
import type { GraphicsTier } from "./preferences";

export default function LevelCelebration({
  level,
  tier,
  reducedMotion,
}: {
  level: number;
  tier: GraphicsTier;
  reducedMotion: boolean;
}) {
  const count = tier === "high" ? 24 : 14;
  return (
    <div className="level-up-event">
      {tier !== "low" && !reducedMotion && (
        <div className="level-celebration" aria-hidden="true">
          <div className="level-halo" />
          <div className="level-shards">
            {Array.from({ length: count }, (_, index) => {
              const angle = (index / count) * Math.PI * 2;
              return (
                <i
                  key={index}
                  style={
                    {
                      "--burst-x": `${Math.cos(angle) * (25 + (index % 3) * 6)}vmin`,
                      "--burst-y": `${Math.sin(angle) * (25 + (index % 3) * 6)}vmin`,
                      "--burst-delay": `${(index % 4) * 35}ms`,
                    } as CSSProperties
                  }
                />
              );
            })}
          </div>
        </div>
      )}
      <div className="level-up-banner">
        <span className="level-up-label">
          <span aria-hidden="true">✦ </span>Level up
          <span aria-hidden="true"> ✦</span>
        </span>
        <strong>Level {level}</strong>
      </div>
    </div>
  );
}
