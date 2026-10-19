import type { CSSProperties } from "react";

export default function ComboFire({ tier }: { tier: number }) {
  return (
    <div
      className="combo-aura"
      aria-hidden="true"
      style={{ "--combo-power": tier } as CSSProperties}
    >
      <div className="fire-jet fire-left">
        <i />
        <i />
        <i />
      </div>
      <div className="fire-jet fire-right">
        <i />
        <i />
        <i />
      </div>
      <div className="combo-embers">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <i key={index} style={{ "--ember": index } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
