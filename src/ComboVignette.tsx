import type { CSSProperties } from "react";

export default function ComboVignette({ tier }: { tier: number }) {
  return (
    <div
      className="combo-vignette"
      data-tier={tier}
      aria-hidden="true"
      style={{ "--combo-power": tier } as CSSProperties}
    />
  );
}
